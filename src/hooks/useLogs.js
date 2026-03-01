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
      const { error } = await supabase.from("logs").delete().eq("id", id);
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

  const updateNotes = useCallback(async (id, newNotes, user) => {
    // Optimistically update state
    setLogs(prev => prev.map(l => l.id === id ? { ...l, notes: newNotes } : l));

    if (user) {
      const { error } = await supabase.from("logs").update({ notes: newNotes }).eq("id", id);
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

  return { logs, setLogs, fetchLogs, mergeGuestLogs, saveLog, deleteLog, updateNotes, links, addLink, removeLink };
};
