# Mic Map (`micmap.co`) — Vercel + Supabase Deploy Runbook

## 1. Prerequisites
- GitHub Repository: `https://github.com/kingtaye-wq/micmap` (`main` branch)
- Supabase project (Postgres + Auth + Storage)
- Vercel project linked to `kingtaye-wq/micmap`
- Stripe Connect account (Test Mode keys for initial verification)

## 2. Supabase Setup
1. Create a new Supabase project in `us-east-1` (or your preferred region).
2. Open the SQL Editor or run Supabase CLI to apply the schema and RLS policies:
   ```bash
   supabase db push
   # or execute supabase/migrations/0001_micmap_mvp.sql in the Supabase SQL Editor
   ```
3. Run the Cleveland CSV seed reconciliation script locally or in CI:
   ```bash
   npm run seed
   ```
   Verify output matches:
   - `131` total rows (`109` karaoke, `22` open mic)
   - `73` `verified` public nights
   - `58` `needs_verification` rows in the Admin Verification Queue
   - `2` rows flagged for missing street address in CSV (`Imposters Theater` row #59 and `Town House Tavern` row #127 — coordinates preserved as `null`).

## 3. Environment Variables Inventory (`.env.example`)
Set the following environment variables in Vercel Project Settings (names only; never expose service/secret keys to the client):

| Variable Name | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Public & Server | Brand name (`Mic Map`) |
| `NEXT_PUBLIC_APP_DOMAIN` | Public & Server | Canonical domain (`micmap.co`) |
| `NEXT_PUBLIC_APP_URL` | Public & Server | Canonical base URL (`https://micmap.co`) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Public & Server | Support email (`support@micmap.co`) |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM` | Public & Server | Instagram handle (`@micmap.co`) |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | Public & Server | Facebook page (`micmapco`) |
| `NEXT_PUBLIC_DEFAULT_METRO` | Public & Server | Default launch metro (`Greater Cleveland`) |
| `NEXT_PUBLIC_DEFAULT_CITY` | Public & Server | Default launch city (`Cleveland, OH`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public & Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public & Server | Supabase anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Supabase service role key for admin/webhook mutations |
| `STRIPE_SECRET_KEY` | **Server-Only** | Stripe Connect secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | **Server-Only** | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_CONNECT_CLIENT_ID` | **Server-Only** | Stripe Connect platform client ID |
| `GHL_API_KEY` | **Server-Only** | GoHighLevel Private Integration token (Mic Map HQ) |
| `GHL_LOCATION_ID` | **Server-Only** | GoHighLevel location ID |
| `MAPS_GEOCODING_API_KEY` | **Server-Only** | Optional geocoder key for future city passes |

## 4. Vercel Deployment
1. Import `kingtaye-wq/micmap` into Vercel.
2. Framework Preset: **Next.js** (`npm run build`).
3. Add the environment variables from §3.
4. Click **Deploy**.
5. Once Alex approves staging, attach `micmap.co` in Vercel Domains (DNS pointing is handled by Alex at the registrar).
