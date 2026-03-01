import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// If keys aren't set yet, export a mock client so the app still renders
// in development or when running without a Supabase project configured.
// The mock supports the full chaining patterns used by the real client.
const isMock = !SUPABASE_URL || !SUPABASE_ANON_KEY;

// A simple chainable builder that resolves to { data, error } at any point
const mockQuery = (data = null, error = null) => {
  const result = Promise.resolve({ data, error });
  // Support chaining: .select(), .single(), .order(), .eq(), .or()
  const builder = {
    select: () => mockQuery(Array.isArray(data) ? data : [], null),
    single: () => Promise.resolve({ data: data ?? { id: crypto.randomUUID() }, error }),
    order: () => Promise.resolve({ data: Array.isArray(data) ? data : [], error }),
    eq: () => mockQuery(data, error),
    or: () => Promise.resolve({ data: [], error }),
    then: result.then.bind(result),
    catch: result.catch.bind(result),
    finally: result.finally.bind(result),
  };
  return builder;
};

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
        select: () => mockQuery([]),
        insert: () => mockQuery({ id: crypto.randomUUID() }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
          or: () => Promise.resolve({ error: null }),
        }),
      }),
      rpc: () => Promise.resolve({ error: null }),
    }
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
