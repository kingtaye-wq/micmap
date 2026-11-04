-- ============================================================================
-- Mic Map (micmap.co) — Amendment 4: Source Provenance & Poster-as-Source Rule
-- Migration: 0002_source_provenance_and_poster_rule.sql
-- ============================================================================

-- 1. Source provenance columns on nights (OS-internal poster profile URL never shown on public pages)
ALTER TABLE IF EXISTS public.nights
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_context TEXT,
  ADD COLUMN IF NOT EXISTS poster_name TEXT,
  ADD COLUMN IF NOT EXISTS poster_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS source_contact_info TEXT,
  ADD COLUMN IF NOT EXISTS captured_date TEXT,
  ADD COLUMN IF NOT EXISTS poster_as_source_status TEXT NOT NULL DEFAULT 'none'
    CHECK (poster_as_source_status IN ('none', 'ask_the_poster', 'draft_outreach_ready', 'verified_by_poster')),
  ADD COLUMN IF NOT EXISTS poster_outreach_draft TEXT;

-- 2. Source provenance columns on micmap_staging_nights
ALTER TABLE IF EXISTS public.micmap_staging_nights
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_context TEXT,
  ADD COLUMN IF NOT EXISTS poster_name TEXT,
  ADD COLUMN IF NOT EXISTS poster_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS source_contact_info TEXT,
  ADD COLUMN IF NOT EXISTS captured_date TEXT,
  ADD COLUMN IF NOT EXISTS poster_as_source_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS poster_outreach_draft TEXT;

-- 3. Dedicated source_provenance lookup table keyed by source_url (for research/source-provenance.csv backfill)
CREATE TABLE IF NOT EXISTS public.source_provenance (
  source_url TEXT PRIMARY KEY,
  source_platform TEXT NOT NULL,
  source_context TEXT NOT NULL,
  poster_name TEXT,
  poster_profile_url TEXT,
  source_contact_info TEXT,
  captured_date TEXT,
  poster_as_source_status TEXT NOT NULL DEFAULT 'none'
    CHECK (poster_as_source_status IN ('none', 'ask_the_poster', 'draft_outreach_ready', 'verified_by_poster')),
  poster_outreach_draft TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.source_provenance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin and staging service read/write source_provenance"
    ON public.source_provenance
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
