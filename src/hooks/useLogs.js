import { useState, useCallback } from "react";
import { supabase } from "../utils/supabase.js";

// Thread links stored locally as { a: id, b: id } pairs
const LINKS_KEY = "dili_threads";
const loadLinks = () => { try { return JSON.parse(localStorage.getItem(LINKS_KEY) || "[]"); } catch { return []; } };
const saveLinks = links => localStorage.setItem(LINKS_KEY, JSON.stringify(links));

const readGuestLogs = () => { try { return JSON.parse(localStorage.getItem("guest_logs") || "[]"); } catch { return []; } };
const writeGuestLogs = logs => localStorage.setItem("guest_logs", JSON.stringify(logs));

export const useLogs = () => {
  const [logs, setLogs] = useState([]);
  const [links, setLinks] = useState(() => loadLinks());

  const fetchLogs = useCallback(async user => {
    if (!user) {
      setLogs(readGuestLogs());
      return;
    }
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, []);

  const mergeGuestLogs = useCallback(async userId => {
    const local = readGuestLogs();
    if (!local.length) return;
    const { error } = await supabase.from("logs").insert(
      local.map(({ id, ...r }) => ({ ...r, user_id: userId }))
    );
    if (!error) {
      localStorage.removeItem("guest_logs");
      fetchLogs({ id: userId });
    }
  }, [fetchLogs]);

  // Returns the ID of the saved/created entry so callers can reference it immediately.
  const saveLog = useCallback(async ({ logData, editingId, user, verdict }) => {
    const isFinished = ["I loved it","I liked it","Meh","I didn't like it"].includes(verdict);
    const entry = {
      ...logData,
      ...(logData.manualDate
        ? { logged_at: new Date(logData.manualDate + "T12:00:00").toISOString() }
        : isFinished ? { logged_at: new Date().toISOString() } : {}
      ),
    };
    delete entry.manualDate;

    if (user) {
      if (editingId) {
        const { error } = await supabase.from("logs").update(entry).eq("id", editingId).eq("user_id", user.id);
        if (error) throw error;
        await fetchLogs(user);
        return editingId;
      } else {
        const { data, error } = await supabase
          .from("logs")
          .insert([{ ...entry, user_id: user.id, logged_at: entry.logged_at || new Date().toISOString() }])
          .select("id")
          .single();
        if (error) throw error;
        await fetchLogs(user);
        return data?.id ?? null;
      }
    } else {
      const cur = readGuestLogs();
      if (editingId) {
        writeGuestLogs(cur.map(l => l.id === editingId ? { ...l, ...entry } : l));
        fetchLogs(null);
        return editingId;
      } else {
        const newId = Date.now().toString();
        cur.unshift({ ...entry, id: newId, logged_at: entry.logged_at || new Date().toISOString() });
        writeGuestLogs(cur);
        fetchLogs(null);
        return newId;
      }
    }
  }, [fetchLogs]);

  const deleteLog = useCallback(async (id, user) => {
    // Optimistically remove from state; revert if DB delete fails
    setLogs(prev => prev.filter(l => l.id !== id));
    setLinks(prev => {
      const next = prev.filter(lk => lk.a !== id && lk.b !== id);
      saveLinks(next);
      return next;
    });

    if (user) {
      const { error } = await supabase.from("logs").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        // Revert optimistic removal — refetch authoritative state
        console.error("Failed to delete log:", error);
        await fetchLogs(user);
        throw error;
      }
    } else {
      writeGuestLogs(readGuestLogs().filter(l => l.id !== id));
    }
  }, [fetchLogs]);

  // Append a dated revisit (new verdict + thoughts) without erasing history.
  // The log's main verdict becomes the latest opinion; the full timeline lives
  // in log.revisits — the original verdict is snapshotted in on first revisit.
  const addRevisit = useCallback(async (log, { verdict, thoughts }, user) => {
    const prior = Array.isArray(log.revisits) && log.revisits.length > 0
      ? log.revisits
      : [{ date: log.logged_at, verdict: log.verdict, thoughts: "" }];
    const next = [...prior, { date: new Date().toISOString(), verdict, thoughts: thoughts?.trim() || "" }];

    // Optimistically update state
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, verdict, revisits: next } : l));

    if (user) {
      const { error } = await supabase.from("logs").update({ verdict, revisits: next }).eq("id", log.id).eq("user_id", user.id);
      if (error) {
        // Revert: refetch authoritative state
        console.error("Failed to save revisit:", error);
        await fetchLogs(user);
        throw error;
      }
    } else {
      writeGuestLogs(readGuestLogs().map(l => l.id === log.id ? { ...l, verdict, revisits: next } : l));
    }
  }, [fetchLogs]);

  // Edit an existing revisit entry (verdict + thoughts) by index. The log's main
  // verdict mirrors the latest entry, so editing the most recent one updates it too.
  const editRevisit = useCallback(async (log, index, { verdict, thoughts }, user) => {
    const arr = Array.isArray(log.revisits) ? [...log.revisits] : [];
    if (index < 0 || index >= arr.length) return;
    arr[index] = { ...arr[index], verdict, thoughts: thoughts?.trim() || "" };
    const mainVerdict = arr[arr.length - 1].verdict;

    // Optimistically update state
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, verdict: mainVerdict, revisits: arr } : l));

    if (user) {
      const { error } = await supabase.from("logs").update({ verdict: mainVerdict, revisits: arr }).eq("id", log.id).eq("user_id", user.id);
      if (error) {
        console.error("Failed to edit revisit:", error);
        await fetchLogs(user);
        throw error;
      }
    } else {
      writeGuestLogs(readGuestLogs().map(l => l.id === log.id ? { ...l, verdict: mainVerdict, revisits: arr } : l));
    }
  }, [fetchLogs]);

  // Remove a revisit entry by index. If only the original impression would remain,
  // collapse the timeline entirely (revisits: []) and restore that verdict.
  const deleteRevisit = useCallback(async (log, index, user) => {
    const arr = Array.isArray(log.revisits) ? [...log.revisits] : [];
    if (index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    const nextRevisits = arr.length <= 1 ? [] : arr;
    const mainVerdict = arr.length > 0 ? arr[arr.length - 1].verdict : log.verdict;

    // Optimistically update state
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, verdict: mainVerdict, revisits: nextRevisits } : l));

    if (user) {
      const { error } = await supabase.from("logs").update({ verdict: mainVerdict, revisits: nextRevisits }).eq("id", log.id).eq("user_id", user.id);
      if (error) {
        console.error("Failed to delete revisit:", error);
        await fetchLogs(user);
        throw error;
      }
    } else {
      writeGuestLogs(readGuestLogs().map(l => l.id === log.id ? { ...l, verdict: mainVerdict, revisits: nextRevisits } : l));
    }
  }, [fetchLogs]);

  const updateNotes = useCallback(async (id, newNotes, user) => {
    // Optimistically update state
    setLogs(prev => prev.map(l => l.id === id ? { ...l, notes: newNotes } : l));

    if (user) {
      const { error } = await supabase.from("logs").update({ notes: newNotes }).eq("id", id).eq("user_id", user.id);
      if (error) {
        // Revert: refetch authoritative state
        console.error("Failed to update notes:", error);
        await fetchLogs(user);
        throw error;
      }
    } else {
      writeGuestLogs(readGuestLogs().map(l => l.id === id ? { ...l, notes: newNotes } : l));
    }
  }, [fetchLogs]);

  // ── THREAD LINKS ─────────────────────────────────────────────────────────
  const addLink = useCallback((aId, bId) => {
    setLinks(prev => {
      const exists = prev.some(lk => (lk.a === aId && lk.b === bId) || (lk.a === bId && lk.b === aId));
      if (exists) return prev;
      const next = [...prev, { a: aId, b: bId, createdAt: new Date().toISOString() }];
      saveLinks(next);
      return next;
    });
  }, []);

  const removeLink = useCallback((aId, bId) => {
    setLinks(prev => {
      const next = prev.filter(lk => !((lk.a === aId && lk.b === bId) || (lk.a === bId && lk.b === aId)));
      saveLinks(next);
      return next;
    });
  }, []);

  return { logs, setLogs, fetchLogs, mergeGuestLogs, saveLog, deleteLog, updateNotes, addRevisit, editRevisit, deleteRevisit, links, addLink, removeLink };
};
