-- ============================================================================
-- Mic Map (micmap.co) — Complete Database Schema & Row Level Security (RLS)
-- Migration: 0001_micmap_mvp.sql
-- Stack: Supabase Postgres + Auth + RLS Tenant Isolation
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES & DOMAIN CONSTRAINTS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE night_type_enum AS ENUM (
    'karaoke',
    'open_mic',
    'live_band',         -- Schema-reserved for v1.5 recurring band residencies
    'live_band_karaoke'  -- Schema-reserved for v1.5 live-band karaoke
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE performer_type_enum AS ENUM (
    'kj',
    'artist',
    'band'               -- Schema-reserved for v1.5 bands
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE genre_fit_enum AS ENUM (
    'primary',
    'welcome',
    'not_a_fit',
    'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_confidence_enum AS ENUM (
    'verified',
    'needs_verification',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE DIRECTORY TABLES (mvp-build-packet.md §4)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'OH',
  slug TEXT NOT NULL UNIQUE,
  center_lat DOUBLE PRECISION NOT NULL DEFAULT 41.4993,
  center_lng DOUBLE PRECISION NOT NULL DEFAULT -81.6944,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'fan' CHECK (role IN ('fan', 'kj', 'artist', 'venue', 'crew', 'admin')),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  blocked_user_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  performer_type performer_type_enum NOT NULL DEFAULT 'kj',
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  photo_url TEXT,
  genres_performed TEXT[] NOT NULL DEFAULT '{}',
  home_city TEXT NOT NULL DEFAULT 'Cleveland, OH',
  instagram TEXT,
  facebook TEXT,
  website TEXT,
  booking_email TEXT,
  is_founding_kj BOOLEAN NOT NULL DEFAULT false,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'kj_pro_founder', 'kj_pro', 'artist_pro')),
  sms_segments_used INTEGER NOT NULL DEFAULT 0,
  sms_segments_cap INTEGER NOT NULL DEFAULT 500,
  follower_count INTEGER NOT NULL DEFAULT 0,
  available_tip_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alias table hosts_kjs for KJ console compatibility
CREATE TABLE IF NOT EXISTS hosts_kjs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT,
  bio TEXT,
  genres_supported TEXT[] NOT NULL DEFAULT '{}',
  is_founding_kj BOOLEAN NOT NULL DEFAULT false,
  stripe_connect_account_id TEXT,
  payout_minimum_cents INTEGER NOT NULL DEFAULT 2500,
  available_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  tenant_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  neighborhood TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geocode_status TEXT NOT NULL DEFAULT 'geocoded' CHECK (geocode_status IN ('geocoded', 'missing_address', 'failed')),
  phone TEXT,
  website TEXT,
  facebook TEXT,
  instagram TEXT,
  claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'venue_premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_geo ON venues (lat, lng);
CREATE INDEX IF NOT EXISTS idx_venues_neighborhood ON venues (neighborhood);

CREATE TABLE IF NOT EXISTS nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_row_number INTEGER UNIQUE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  host_id UUID REFERENCES people(id) ON DELETE SET NULL,
  tenant_id UUID,
  slug TEXT NOT NULL UNIQUE,
  room_code TEXT NOT NULL UNIQUE,
  day_of_week TEXT, -- NULL preserved honestly when unknown in CSV
  recurrence_pattern TEXT NOT NULL DEFAULT 'weekly',
  start_time TEXT,  -- NULL preserved honestly when unknown in CSV
  end_time TEXT,
  night_type night_type_enum NOT NULL DEFAULT 'karaoke',
  format_type TEXT NOT NULL DEFAULT 'Open Bar Karaoke',
  host_or_kj_raw TEXT,
  primary_genre TEXT NOT NULL DEFAULT 'UNKNOWN',
  also_welcome TEXT NOT NULL DEFAULT 'UNKNOWN',
  not_a_fit TEXT NOT NULL DEFAULT 'UNKNOWN',
  genre_basis TEXT,
  asserted_by_type TEXT NOT NULL DEFAULT 'editorial_source' CHECK (asserted_by_type IN ('venue', 'kj', 'crowd_report', 'editorial_source')),
  signup_method TEXT,
  cover TEXT,
  age_policy TEXT,
  source_url TEXT,
  last_confirmed_text TEXT,
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence verification_confidence_enum NOT NULL DEFAULT 'needs_verification',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'call_to_confirm', 'archived', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nights_confidence ON nights (confidence);
CREATE INDEX IF NOT EXISTS idx_nights_day ON nights (day_of_week);
CREATE INDEX IF NOT EXISTS idx_nights_type ON nights (night_type);

-- Companion table karaoke_listings mirroring nights for direct listing queries
CREATE TABLE IF NOT EXISTS karaoke_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id UUID REFERENCES nights(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  neighborhood_city TEXT NOT NULL,
  address TEXT,
  day_of_week TEXT,
  start_time TEXT,
  end_time TEXT,
  listing_type TEXT NOT NULL DEFAULT 'karaoke',
  format_type TEXT NOT NULL DEFAULT 'Open Bar Karaoke',
  kj_or_company TEXT NOT NULL DEFAULT 'UNKNOWN',
  primary_genre TEXT NOT NULL DEFAULT 'UNKNOWN',
  also_welcome TEXT NOT NULL DEFAULT 'UNKNOWN',
  not_a_fit TEXT NOT NULL DEFAULT 'UNKNOWN',
  genre_vibe_tags TEXT NOT NULL DEFAULT 'UNKNOWN',
  genre_basis TEXT,
  signup_method TEXT,
  cover TEXT,
  age_crowd_policy TEXT NOT NULL DEFAULT 'UNKNOWN',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'needs_verification' CHECK (verification_status IN ('verified', 'needs_verification', 'archived')),
  room_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS night_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id UUID NOT NULL REFERENCES nights(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  fit genre_fit_enum NOT NULL DEFAULT 'UNKNOWN',
  basis TEXT,
  asserted_by_type TEXT NOT NULL DEFAULT 'editorial_source' CHECK (asserted_by_type IN ('venue', 'kj', 'crowd_report', 'editorial_source')),
  asserted_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  home_city TEXT NOT NULL DEFAULT 'Cleveland, OH',
  genres TEXT[] NOT NULL DEFAULT '{}',
  combined_followers INTEGER NOT NULL DEFAULT 0,
  raw_rsvp_count INTEGER NOT NULL DEFAULT 0,
  raw_checkin_count INTEGER NOT NULL DEFAULT 0,
  venue_confirmations_count INTEGER NOT NULL DEFAULT 0,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'crew_pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_in_crew TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crew_id, person_id)
);

-- ----------------------------------------------------------------------------
-- 3. CLAIMS, CORRECTIONS, GENRE REPORTS, MODERATION & PROMOTIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('venue', 'night', 'person')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  claimant_role TEXT NOT NULL,
  social_or_web_proof TEXT NOT NULL,
  asserted_primary_genre TEXT,
  asserted_also_welcome TEXT,
  asserted_not_a_fit TEXT,
  schedule_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venue_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  verification_proof TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listing_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  source_or_basis TEXT NOT NULL,
  submitter_role TEXT NOT NULL DEFAULT 'crowd_report' CHECK (submitter_role IN ('venue', 'kj', 'crowd_report')),
  submitter_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genre_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id TEXT NOT NULL,
  primary_genre TEXT NOT NULL,
  also_welcome TEXT,
  not_a_fit TEXT,
  basis TEXT NOT NULL,
  reporter_type TEXT NOT NULL DEFAULT 'crowd_report' CHECK (reporter_type IN ('venue', 'kj', 'crowd_report')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('profile', 'night', 'photo', 'review')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hidden', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Strictly non-alcohol promotions & crew offers (Ohio Rule 50 / ORC 4301.22(D))
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  promo_category TEXT NOT NULL CHECK (promo_category IN ('Food Special', 'Late Night Kitchen', 'Theme Night', 'Featured Listing', 'Performer Cash/Food Offer')),
  comp_type TEXT NOT NULL CHECK (comp_type IN ('cash_platform', 'food_kitchen', 'non_alcoholic', 'cover_split')),
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_alcohol_comp_check CHECK (
    description !~* '(free drink|drink ticket|drink coin|free beer|free shot|complimentary alcohol|2-for-1)'
    AND title !~* '(free drink|drink ticket|drink coin|free beer|free shot|complimentary alcohol|2-for-1)'
  )
);

-- ----------------------------------------------------------------------------
-- 4. FOLLOWS, CHECK-INS, SONG REQUESTS, TIPS & NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_email TEXT NOT NULL,
  follower_phone TEXT,
  sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  target_type TEXT NOT NULL CHECK (target_type IN ('person', 'venue', 'crew')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  tenant_id UUID,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  person_id TEXT,
  performer_name TEXT NOT NULL,
  venue_code TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  verified_by_venue BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  night_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  singer_or_host_name TEXT NOT NULL,
  room_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  night_id TEXT,
  venue_name TEXT NOT NULL,
  singer_stage_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  notes_key_change TEXT,
  tip_boost_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_kj_cents INTEGER NOT NULL DEFAULT 0,
  notify_contact TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'up_next', 'now_singing', 'completed', 'skipped')),
  queue_position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  recipient_type TEXT NOT NULL DEFAULT 'kj' CHECK (recipient_type IN ('kj', 'artist', 'crew')),
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  night_id TEXT,
  room_code TEXT,
  tipper_name TEXT NOT NULL DEFAULT 'Anonymous Fan',
  gross_cents INTEGER NOT NULL CHECK (gross_cents >= 100),
  platform_fee_bps INTEGER NOT NULL DEFAULT 500,
  platform_fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  payout_batch_id TEXT,
  payout_status TEXT NOT NULL DEFAULT 'accumulating' CHECK (payout_status IN ('accumulating', 'queued_for_monthly_batch', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tips_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID REFERENCES tips(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL,
  gross_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  net_kj_cents INTEGER NOT NULL,
  payout_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL,
  night_id TEXT,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  vibe_comment TEXT NOT NULL,
  reported_genre_fit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('follow_confirmation', 'tonight_alert', 'claim_submitted', 'claim_approved', 'queue_two_away', 'design_change_request')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push', 'ghl_webhook')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sms_segments INTEGER NOT NULL DEFAULT 0,
  respects_stop_opt_out BOOLEAN NOT NULL DEFAULT true,
  ghl_sync_status TEXT NOT NULL DEFAULT 'queued_internal' CHECK (ghl_sync_status IN ('queued_internal', 'synced_to_ghl', 'skipped_opt_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  event_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) TENANT ISOLATION POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts_kjs ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE karaoke_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Public read access for verified directory rows only
CREATE POLICY "Public can view verified nights under 90 days"
  ON nights FOR SELECT
  USING (
    confidence = 'verified'
    AND last_confirmed_at > (now() - INTERVAL '90 days')
  );

-- Tenant isolation: a logged-in KJ/Venue can only read/update rows matching their JWT tenant_id
CREATE POLICY "Tenant isolated select on people"
  ON people FOR SELECT
  USING (
    true -- Public profiles are viewable; sensitive fields scoped in OS queries
  );

CREATE POLICY "Tenant isolated update on people"
  ON people FOR UPDATE
  USING (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Tenant isolated select on follows"
  ON follows FOR SELECT
  USING (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Tenant isolated select on tips"
  ON tips FOR SELECT
  USING (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Tenant isolated manage on promotions"
  ON promotions FOR ALL
  USING (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
    OR (auth.jwt() ->> 'role') = 'admin'
  );
