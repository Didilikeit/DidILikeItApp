-- ─── COLLECTIONS ───────────────────────────────────────────────────────────────
-- Persists user-defined collections server-side so they survive device changes.
-- Previously stored only in localStorage.

CREATE TABLE IF NOT EXISTS public.collections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  emoji      text NOT NULL DEFAULT '🗂',
  desc       text NOT NULL DEFAULT '',
  color      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own collections"
  ON public.collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── THREAD LINKS ──────────────────────────────────────────────────────────────
-- Persists inspired-by connections between log entries server-side.
-- Previously stored only in localStorage.

CREATE TABLE IF NOT EXISTS public.thread_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  a          uuid REFERENCES public.logs(id) ON DELETE CASCADE NOT NULL,
  b          uuid REFERENCES public.logs(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- Prevent duplicate links in either direction
  CONSTRAINT thread_links_unique UNIQUE (a, b),
  CONSTRAINT thread_links_no_self CHECK (a <> b)
);

ALTER TABLE public.thread_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own thread links"
  ON public.thread_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups when fetching a log's connections
CREATE INDEX IF NOT EXISTS thread_links_a_idx ON public.thread_links (a);
CREATE INDEX IF NOT EXISTS thread_links_b_idx ON public.thread_links (b);
