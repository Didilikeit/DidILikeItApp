import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// If keys aren't set yet, export a mock client so the app still renders
const isMock = !SUPABASE_URL || !SUPABASE_ANON_KEY;

if (isMock) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — " +
    "running in mock mode. Nothing will be saved to the database."
  );
}

export const supabase = isMock
  ? {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ data: {}, error: null }),
        signOut: () => Promise.resolve(),
        signInWithOAuth: () => Promise.resolve(),
        resetPasswordForEmail: () => Promise.resolve({ error: null }),
        updateUser: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          eq:    () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        }),
        insert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
        delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      }),
      rpc: () => Promise.resolve({ error: null }),
    }
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Collections helpers ───────────────────────────────────────────────────
// These talk to a "collections" table in Supabase so collections sync across
// devices. Guest users (not logged in) fall back to localStorage exactly like
// logs do.

const GUEST_COLLS_KEY = "dili_collections_guest";

/** Load collections for a user. Returns an array. */
export async function fetchCollections(user) {
  if (!user) {
    try {
      return JSON.parse(localStorage.getItem(GUEST_COLLS_KEY) || "[]");
    } catch {
      return [];
    }
  }
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[collections] fetch error:", error.message);
    return [];
  }
  // Map the DB column "description" back to "desc" so the rest of the app is consistent
  return (data || []).map(c => ({ ...c, desc: c.description }));
}

/** Create a new collection. Returns the new collection object or null. */
export async function createCollection(user, { name, emoji, desc }) {
  if (!user) {
    const newColl = {
      id: Date.now().toString(),
      name,
      emoji,
      desc,
      created_at: new Date().toISOString(),
    };
    try {
      const cur = JSON.parse(localStorage.getItem(GUEST_COLLS_KEY) || "[]");
      localStorage.setItem(GUEST_COLLS_KEY, JSON.stringify([...cur, newColl]));
    } catch {}
    return newColl;
  }
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: user.id, name, emoji, description: desc })
    .select();
  if (error) {
    console.error("[collections] create error:", error.message);
    return null;
  }
  return data?.[0] || null;
}

/** Update an existing collection's name/emoji/desc. */
export async function updateCollection(user, id, { name, emoji, desc }) {
  if (!user) {
    try {
      const cur = JSON.parse(localStorage.getItem(GUEST_COLLS_KEY) || "[]");
      localStorage.setItem(
        GUEST_COLLS_KEY,
        JSON.stringify(cur.map(c => (c.id === id ? { ...c, name, emoji, desc } : c)))
      );
    } catch {}
    return;
  }
  const { error } = await supabase
    .from("collections")
    .update({ name, emoji, description: desc })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("[collections] update error:", error.message);
}

/** Delete a collection and strip collection_id from all its logs. */
export async function deleteCollection(user, id) {
  if (!user) {
    try {
      const cur = JSON.parse(localStorage.getItem(GUEST_COLLS_KEY) || "[]");
      localStorage.setItem(
        GUEST_COLLS_KEY,
        JSON.stringify(cur.filter(c => c.id !== id))
      );
      const logs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
      localStorage.setItem(
        "guest_logs",
        JSON.stringify(logs.map(l => (l.collection_id === id ? { ...l, collection_id: null } : l)))
      );
    } catch {}
    return;
  }
  // Clear collection_id on all affected logs first
  await supabase
    .from("logs")
    .update({ collection_id: null })
    .eq("collection_id", id)
    .eq("user_id", user.id);
  // Then delete the collection itself
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("[collections] delete error:", error.message);
}

/** Migrate guest collections into Supabase after a user logs in. */
export async function mergeGuestCollections(userId) {
  try {
    const guestColls = JSON.parse(localStorage.getItem(GUEST_COLLS_KEY) || "[]");
    if (guestColls.length === 0) return {};

    // Build a map of old guest ID → new Supabase ID so logs can be updated
    const idMap = {};
    for (const c of guestColls) {
      const { data, error } = await supabase
        .from("collections")
        .insert({ user_id: userId, name: c.name, emoji: c.emoji, description: c.desc })
        .select();
      if (!error && data?.[0]) {
        idMap[c.id] = data[0].id;
      }
    }

    // Update any guest logs that referenced old collection IDs
    const guestLogs = JSON.parse(localStorage.getItem("guest_logs") || "[]");
    const updatedLogs = guestLogs.map(l =>
      l.collection_id && idMap[l.collection_id]
        ? { ...l, collection_id: idMap[l.collection_id] }
        : l
    );
    localStorage.setItem("guest_logs", JSON.stringify(updatedLogs));

    // Clean up guest collections from localStorage
    localStorage.removeItem(GUEST_COLLS_KEY);

    return idMap;
  } catch (e) {
    console.error("[collections] merge error:", e);
    return {};
  }
}
