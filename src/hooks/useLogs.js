import { useState, useCallback } from "react";
import { supabase } from "../utils/supabase.js";

export const useLogs = () => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(async user => {
    if (!user) {
      setLogs(JSON.parse(localStorage.getItem("guest_logs") || "[]"));
      return;
    }
    const { data, error } = await supabase.from("logs").select("*").order("logged_at", { ascending: false });
    if (!error) setLogs(data || []);
  }, []);

  const mergeGuestLogs = useCallback(async userId => {
    const local = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    if (!local.length) return;
    const { error } = await supabase.from("logs").insert(
      local.map(({ id, ...r }) => ({ ...r, user_id: userId }))
    );
    if (!error) {
      localStorage.removeItem("guest_logs");
      fetchLogs({ id: userId });
    }
  }, [fetchLogs]);

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
      const { error } = editingId
        ? await supabase.from("logs").update(entry).eq("id", editingId)
        : await supabase.from("logs").insert([{ ...entry, user_id: user.id, logged_at: entry.logged_at || new Date().toISOString() }]);
      if (error) throw error;
      await fetchLogs(user);
    } else {
      let cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      if (editingId) {
        cur = cur.map(l => l.id === editingId ? { ...l, ...entry } : l);
      } else {
        cur.unshift({ ...entry, id: Date.now().toString(), logged_at: entry.logged_at || new Date().toISOString() });
      }
      localStorage.setItem("guest_logs", JSON.stringify(cur));
      fetchLogs(null);
    }
  }, [fetchLogs]);

  const deleteLog = useCallback(async (id, user) => {
    if (user) {
      await supabase.from("logs").delete().eq("id", id);
    } else {
      const cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      localStorage.setItem("guest_logs", JSON.stringify(cur.filter(l => l.id !== id)));
    }
    setLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  const updateNotes = useCallback(async (id, newNotes, user) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, notes: newNotes } : l));
    if (user) {
      await supabase.from("logs").update({ notes: newNotes }).eq("id", id);
    } else {
      const cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      localStorage.setItem("guest_logs", JSON.stringify(cur.map(l => l.id === id ? { ...l, notes: newNotes } : l)));
    }
  }, []);

  return { logs, setLogs, fetchLogs, mergeGuestLogs, saveLog, deleteLog, updateNotes };
};
