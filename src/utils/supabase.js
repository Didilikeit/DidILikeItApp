import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// If keys aren't set yet, export a mock client so the app still renders
const isMock = !SUPABASE_URL || !SUPABASE_ANON_KEY;

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
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      rpc: () => Promise.resolve({ error: null }),
    }
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
