import { useState, useCallback } from "react";
import { supabase } from "../utils/supabase.js";

// Thread links: localStorage fallback for guest mode
const LINKS_KEY = "dili_threads";
const loadLinks = () => {
  try { return JSON.parse(localStorage.getItem(LINKS_KEY) || "[]"); }
  catch { return []; }
};
const saveLinks = links => localStorage.setItem(LINKS_KEY, JSON.stringify(links));

export const useLogs = () => {
  const [logs, setLogs] = useState([]);
  const [links, setLinks] = useState(() => loadLinks());

  // ── FETCH ─────────────────────────────────────────────────────────────────
  // Fetches logs AND thread links together. Thread links live in Supabase for
  // authenticated users and in localStorage for guests.
  const fetchLogs = useCallback(async user => {
    if (!user) {
      try {
        setLogs(JSON.parse(localStorage.getItem("guest_logs") || "[]"));
      } catch {
        // Corrupted localStorage — reset gracefully
        setLogs([]);
        localStorage.removeItem("guest_logs");
      }
      setLinks(loadLinks());
      return;
    }
    // Fetch logs and thread links in parallel for efficiency
    const [logsResult, linksResult] = await Promise.all([
      supabase.from("logs").select("*").order("logged_at", { ascending: false }),
      supabase.from("thread_links").select("*"),
    ]);
    if (!logsResult.error) setLogs(logsResult.data || []);
    if (!linksResult.error && linksResult.data) {
      setLinks(linksResult.data.map(r => ({ a: r.a, b: r.b, createdAt: r.created_at })));
    }
  }, []);

  // ── MERGE GUEST LOGS ──────────────────────────────────────────────────────
  // Note: guest log IDs are replaced by Supabase-generated UUIDs on import,
  // so existing thread links stored locally cannot be migrated automatically —
  // they reference IDs that no longer exist after migration.
  const mergeGuestLogs = useCallback(async userId => {
    let local;
    try { local = JSON.parse(localStorage.getItem("guest_logs") || "[]"); }
    catch { local = []; }
    if (!local.length) return;
    const { error } = await supabase.from("logs").insert(
      local.map(({ id, ...r }) => ({ ...r, user_id: userId }))
    );
    if (!error) {
      localStorage.removeItem("guest_logs");
      // Also clear local thread links since IDs are no longer valid after migration
      localStorage.removeItem("dili_threads");
      setLinks([]);
      fetchLogs({ id: userId });
    }
  }, [fetchLogs]);

  // ── SAVE ──────────────────────────────────────────────────────────────────
  // Returns the ID of the saved entry so callers can act on it immediately
  // (e.g. creating an inspired-by thread link without a setTimeout race).
  const saveLog = useCallback(async ({ logData, editingId, user, verdict }) => {
    const isFinished = ["I loved it","I liked it","Meh","I didn't like it"].includes(verdict);
    const entry = {
      ...logData,
      ...(logData.manualDate
        ? { logged_at: new Date(logData.manualDate).toISOString() }
        : isFinished ? { logged_at: new Date().toISOString() } : {}
      ),
    };
    delete entry.manualDate;

    if (user) {
      if (editingId) {
        const { error } = await supabase.from("logs").update(entry).eq("id", editingId);
        if (error) throw error;
        await fetchLogs(user);
        return editingId;
      } else {
        const { data, error } = await supabase
          .from("logs")
          .insert([{ ...entry, user_id: user.id, logged_at: entry.logged_at || new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        await fetchLogs(user);
        return data.id;
      }
    } else {
      let cur;
      try { cur = JSON.parse(localStorage.getItem("guest_logs") || "[]"); }
      catch { cur = []; }

      if (editingId) {
        cur = cur.map(l => l.id === editingId ? { ...l, ...entry } : l);
        localStorage.setItem("guest_logs", JSON.stringify(cur));
        fetchLogs(null);
        return editingId;
      } else {
        const newId = crypto.randomUUID();
        cur.unshift({ ...entry, id: newId, logged_at: entry.logged_at || new Date().toISOString() });
        localStorage.setItem("guest_logs", JSON.stringify(cur));
        fetchLogs(null);
        return newId;
      }
    }
  }, [fetchLogs]);

  // ── TWO-PHASE DELETE ──────────────────────────────────────────────────────
  // The undo pattern needs the DB delete to be deferred. We split this into:
  //
  //   removeFromUI(id)       — instant optimistic removal from state only
  //   commitDelete(id, user) — actual DB/localStorage delete (call after undo window)
  //
  // On undo: just call fetchLogs() to restore state from the still-intact DB.

  const removeFromUI = useCallback(id => {
    setLogs(prev => prev.filter(l => l.id !== id));
    setLinks(prev => prev.filter(lk => lk.a !== id && lk.b !== id));
  }, []);

  const commitDelete = useCallback(async (id, user) => {
    if (user) {
      const { error } = await supabase.from("logs").delete().eq("id", id);
      if (error) throw error;
      // Clean up related thread links on the server
      await supabase.from("thread_links").delete().or(`a.eq.${id},b.eq.${id}`);
    } else {
      try {
        const cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
        localStorage.setItem("guest_logs", JSON.stringify(cur.filter(l => l.id !== id)));
        const updatedLinks = loadLinks().filter(lk => lk.a !== id && lk.b !== id);
        saveLinks(updatedLinks);
      } catch { /* ignore */ }
    }
  }, []);

  // ── UPDATE NOTES ──────────────────────────────────────────────────────────
  // Optimistically updates notes in UI, rolls back if the server rejects it.
  const updateNotes = useCallback(async (id, newNotes, user) => {
    let prevNotes;
    setLogs(prev => {
      const entry = prev.find(l => l.id === id);
      prevNotes = entry?.notes;
      return prev.map(l => l.id === id ? { ...l, notes: newNotes } : l);
    });

    if (user) {
      const { error } = await supabase.from("logs").update({ notes: newNotes }).eq("id", id);
      if (error) {
        // Rollback to previous notes
        setLogs(prev => prev.map(l => l.id === id ? { ...l, notes: prevNotes } : l));
        throw error;
      }
    } else {
      let cur;
      try { cur = JSON.parse(localStorage.getItem("guest_logs") || "[]"); } catch { cur = []; }
      localStorage.setItem("guest_logs", JSON.stringify(cur.map(l => l.id === id ? { ...l, notes: newNotes } : l)));
    }
  }, []);

  // ── THREAD LINKS ──────────────────────────────────────────────────────────
  // Links are synced to Supabase for authenticated users. The `user` param is
  // required so links persist across devices.
  const addLink = useCallback(async (aId, bId, user) => {
    setLinks(prev => {
      if (prev.some(lk => (lk.a === aId && lk.b === bId) || (lk.a === bId && lk.b === aId))) {
        return prev;
      }
      const next = [...prev, { a: aId, b: bId, createdAt: new Date().toISOString() }];
      if (!user) saveLinks(next);
      return next;
    });
    if (user) {
      // Unique constraint on (a, b) in Supabase prevents duplicates — ignore duplicate errors
      await supabase.from("thread_links").insert([{ a: aId, b: bId }]);
    }
  }, []);

  const removeLink = useCallback(async (aId, bId, user) => {
    setLinks(prev => {
      const next = prev.filter(lk => !((lk.a === aId && lk.b === bId) || (lk.a === bId && lk.b === aId)));
      if (!user) saveLinks(next);
      return next;
    });
    if (user) {
      await supabase.from("thread_links")
        .delete()
        .or(`and(a.eq.${aId},b.eq.${bId}),and(a.eq.${bId},b.eq.${aId})`);
    }
  }, []);

  return {
    logs, setLogs,
    fetchLogs, mergeGuestLogs,
    saveLog,
    removeFromUI, commitDelete,
    updateNotes,
    links, addLink, removeLink,
  };
};
