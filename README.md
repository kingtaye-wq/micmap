# Mic Map (`micmap.co`) — Greater Cleveland Karaoke & Open Mic MVP

Every karaoke and open mic night in Greater Cleveland on one map — with **verified genre-fit per night** (`Primary Genre`, `Also Welcome`, `Not a Fit`), follow + QR-tip pages for KJs, artists, and crews, a live singer song-request room, a KJ stage console with printable table-tent QR posters, and **Mic Map OS** (tenant-isolated via Supabase Row Level Security).

## Quick Start

```bash
npm install
npm run seed       # Parses data/cleveland-venues-master.csv & outputs data/seed-reconciliation-report.json
npm run dev        # Starts local development server at http://localhost:3000
npm run build      # Production Next.js build
npm run test:e2e   # Runs Playwright acceptance suite (all 10 checks)
```

## Architecture & Key Paths

- **Single Brand & Money Math Config**: [`src/config/brand.ts`](./src/config/brand.ts) (`APP_NAME = "Mic Map"`, `APP_DOMAIN = "micmap.co"`, `TIP_PLATFORM_FEE_BPS = 500`, `KJ_PAYOUT_MINIMUM_CENTS = 2500`, `FRESHNESS_VERIFY_DAYS = 45`, `FRESHNESS_ARCHIVE_DAYS = 90`).
- **Database Migration & RLS Policies**: [`supabase/migrations/0001_micmap_mvp.sql`](./supabase/migrations/0001_micmap_mvp.sql).
- **Seed Data & Reconciliation Script**: [`data/cleveland-venues-master.csv`](./data/cleveland-venues-master.csv) (131 rows: 73 `verified`, 58 `needs_verification`), [`scripts/seed-cleveland.ts`](./scripts/seed-cleveland.ts), and [`data/seed-reconciliation-report.json`](./data/seed-reconciliation-report.json).
- **Muse Design Mockups**: [`docs/mockups/`](./docs/mockups/).
- **Step-by-Step Deploy Runbook**: [`docs/DEPLOY_RUNBOOK.md`](./docs/DEPLOY_RUNBOOK.md).
