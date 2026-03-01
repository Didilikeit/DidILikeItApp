import { useState, useCallback } from "react";
import { supabase } from "../utils/supabase.js";

const LS_KEY = "dili_collections";

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
};

// ─── useCollections ───────────────────────────────────────────────────────────
// Manages collections with Supabase sync for authenticated users and
// localStorage fallback for guests. The same shaped objects are used in both
// cases: { id, name, emoji, desc, color, createdAt }
//
// Supabase table required (see supabase/migrations/20240101_collections_threads.sql):
//   CREATE TABLE collections (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//     name text NOT NULL,
//     emoji text NOT NULL DEFAULT '🗂',
//     desc text NOT NULL DEFAULT '',
//     color text,
//     created_at timestamptz DEFAULT now()
//   );
//
export const useCollections = () => {
  const [collections, setCollections] = useState(() => loadLocal());

  // ── FETCH ──────────────────────────────────────────────────────────────────
  const fetchCollections = useCallback(async user => {
    if (!user) {
      setCollections(loadLocal());
      return;
    }
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, name: r.name, emoji: r.emoji, desc: r.desc,
        color: r.color, createdAt: r.created_at,
      }));
      setCollections(mapped);
    }
  }, []);

  // ── MERGE GUEST COLLECTIONS ────────────────────────────────────────────────
  // Called once on sign-up to push locally-stored collections to Supabase.
  // Returns a map of { oldId -> newSupabaseId } so callers can update
  // collection_id references on logs before those are migrated.
  const mergeGuestCollections = useCallback(async userId => {
    const local = loadLocal();
    if (!local.length) return {};

    const idMap = {};
    for (const c of local) {
      const { data, error } = await supabase
        .from("collections")
        .insert([{ user_id: userId, name: c.name, emoji: c.emoji || "🗂", desc: c.desc || "", color: c.color || null }])
        .select()
        .single();
      if (!error && data) idMap[c.id] = data.id;
    }
    localStorage.removeItem(LS_KEY);
    return idMap;
  }, []);

  // ── SAVE (create or update) ────────────────────────────────────────────────
  const saveCollection = useCallback(async ({ name, emoji, desc, editingId, user }) => {
    if (!name?.trim()) return;
    if (user) {
      if (editingId) {
        const { error } = await supabase
          .from("collections")
          .update({ name: name.trim(), emoji, desc: desc.trim() })
          .eq("id", editingId);
        if (error) throw error;
        setCollections(prev => prev.map(c =>
          c.id === editingId ? { ...c, name: name.trim(), emoji, desc: desc.trim() } : c
        ));
      } else {
        const { data, error } = await supabase
          .from("collections")
          .insert([{ user_id: user.id, name: name.trim(), emoji, desc: desc.trim() }])
          .select()
          .single();
        if (error) throw error;
        const newColl = { id: data.id, name: data.name, emoji: data.emoji, desc: data.desc, color: data.color, createdAt: data.created_at };
        setCollections(prev => [...prev, newColl]);
        return newColl;
      }
    } else {
      if (editingId) {
        setCollections(prev => {
          const updated = prev.map(c => c.id === editingId ? { ...c, name: name.trim(), emoji, desc: desc.trim() } : c);
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
          return updated;
        });
      } else {
        const newColl = { id: crypto.randomUUID(), name: name.trim(), emoji, desc: desc.trim(), createdAt: new Date().toISOString() };
        setCollections(prev => {
          const updated = [...prev, newColl];
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
          return updated;
        });
        return newColl;
      }
    }
  }, []);

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const deleteCollection = useCallback(async (id, user) => {
    setCollections(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (!user) localStorage.setItem(LS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (user) {
      // Supabase: null out collection_id on logs that referenced this collection,
      // then delete the collection itself.
      await supabase.from("logs").update({ collection_id: null }).eq("collection_id", id);
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    } else {
      // Guest: update localStorage logs
      try {
        const cur = JSON.parse(localStorage.getItem("guest_logs") || "[]");
        localStorage.setItem("guest_logs", JSON.stringify(
          cur.map(l => l.collection_id === id ? { ...l, collection_id: null } : l)
        ));
      } catch { /* ignore */ }
    }
  }, []);

  return { collections, setCollections, fetchCollections, mergeGuestCollections, saveCollection, deleteCollection };
};
