/**
 * Single Rename-Safe Brand & Platform Configuration Block
 * Source of truth: brands/mic-map.md & tasks/micmap/mvp-build-packet.md
 *
 * Changing APP_NAME or APP_DOMAIN in this single file (or via NEXT_PUBLIC_APP_NAME /
 * NEXT_PUBLIC_APP_DOMAIN environment variables) updates headers, metadata, QR codes,
 * printable posters, transactional notification templates, and Mic Map OS surfaces.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mic Map";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "micmap.co";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || `https://${APP_DOMAIN}`;
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || `support@${APP_DOMAIN}`;
export const ENV_LABEL = process.env.NEXT_PUBLIC_ENV_LABEL || "staging";
export const STAGING_BANNER_TEXT =
  "Preview build — staging (not promoted to production · micmap.co DNS untouched)";

export const SOCIAL_HANDLES = {
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "@micmap.co",
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "micmapco",
} as const;

export const DEFAULT_METRO =
  process.env.NEXT_PUBLIC_DEFAULT_METRO || "Greater Cleveland";
export const DEFAULT_CITY =
  process.env.NEXT_PUBLIC_DEFAULT_CITY || "Cleveland, OH";
export const DEFAULT_CITY_SLUG = "cleveland";

/** Public-facing AI assistant label — never "Dre" on public pages */
export const PUBLIC_ASSISTANT_TITLE = "AI Chief of Staff";

/** Locked Pricing & Money Math (tasks/micmap/mic-map-blueprint.md §4) */
export const TIP_PLATFORM_FEE_BPS = 500; // 5.00% platform fee on tips
export const TIP_PLATFORM_FEE_RATE = TIP_PLATFORM_FEE_BPS / 10000; // 0.05
export const SUPPORTER_MEMBERSHIP_FEE_BPS = 1000; // 10.00% (v1.5 schema)
export const KJ_PAYOUT_MINIMUM_CENTS = 2500; // $25.00 minimum batch payout threshold
export const KJ_PAYOUT_MAX_MINIMUM_CENTS = 5000; // $25-$50 batch threshold window

export const PRICING_TIERS = {
  kjProFounderMonthlyCents: 2400, // $24/mo founder rate
  kjProRegularMonthlyCents: 3900, // $39/mo regular rate
  kjProIncludedSmsSegments: 500, // ~500 SMS segments cap per month
  venuePremiumMonthlyCents: 5900, // $59/mo upsell on a free claimed listing
  crewProMonthlyCents: 1900, // $19/mo per crew
  artistProMonthlyCents: 900, // $9/mo artist pro
  bookingFeeCombinedBps: 1500, // ~15% combined split (10% venue + 5% performer), NO minimum fee
  bookingFeeMinimumCents: 0, // Explicitly $0 minimum fee
  foundingKjFreeMonths: 6, // 6 months KJ Pro free for keeping nights + genre tags current
} as const;

/** Freshness Windows (tasks/micmap/mvp-build-packet.md §1 & §8) */
export const FRESHNESS_VERIFY_DAYS = 45; // >= 45 days unconfirmed -> "Call to confirm" / Re-Verification badge
export const FRESHNESS_ARCHIVE_DAYS = 90; // >= 90 days unconfirmed -> leaves public map, retained in admin

/** Legal Comp Options (Ohio Rule 50 / OAC 4301:1-1-50 & ORC 4301.22(D) compliant) */
export const LEGAL_COMP_OPTIONS = [
  {
    id: "cash_platform",
    label: "Cash Stipend (via Platform)",
    description: "Direct performer/crew payout settled through Stripe Connect.",
  },
  {
    id: "food_kitchen",
    label: "Food / Kitchen Comp",
    description: "Complimentary meal or kitchen tab credit for performers.",
  },
  {
    id: "non_alcoholic",
    label: "Non-Alcoholic Refreshments",
    description: "Coffee, mocktails, energy drinks, and soft beverages only.",
  },
  {
    id: "cover_split",
    label: "Door / Cover Revenue Split",
    description: "Percentage split of ticketed or door cover proceeds.",
  },
] as const;

/** Official Seed Genre Taxonomy (mvp-build-packet.md §4) */
export const GENRE_TAXONOMY = [
  "Hip-Hop/Rap",
  "R&B/Soul",
  "Rock",
  "Metal/Punk",
  "Country",
  "Pop/Top 40",
  "Throwbacks/Oldies",
  "Ballads",
  "Comedy",
  "Poetry/Spoken Word",
  "Acoustic/Folk",
  "Blues",
  "Jazz",
  "Latin",
  "Dance/EDM",
  "All Genres",
  "Originals",
  "Covers",
] as const;

export type GenreTag = (typeof GENRE_TAXONOMY)[number];

/** Founding KJ First Targets (mvp-build-packet.md §1) */
export const FOUNDING_KJ_TARGETS = [
  "Shell Yeah Events by MeShell",
  "Strong Style Karaoke",
  "Big Dave Karaoke",
] as const;

/** Neon-Noir Design Tokens (brands/mic-map.md) */
export const DESIGN_TOKENS = {
  colors: {
    obsidian: "#0B0B14", // After-Hours Obsidian (background)
    boothSlate: "#151525", // Booth Slate (secondary surface)
    stageCard: "#1E1E34", // Stage Card (elevated card)
    neonMagenta: "#FF2E93", // Neon Magenta (primary accent)
    electricCyan: "#00F0FF", // Electric Cyan (secondary accent)
    spotlightAmber: "#FFB800", // Spotlight Amber (warning / freshness 45d)
    liveGreen: "#00E676", // Live Green (verified / live status)
    stageWhite: "#F8F9FA", // Warm Stage White (primary text)
    mutedChrome: "#A0A3BD", // Muted Chrome (secondary text)
  },
  fonts: {
    display: "Space Grotesk",
    sans: "Plus Jakarta Sans",
    mono: "JetBrains Mono",
  },
} as const;

export const BRAND_CONFIG = {
  appName: APP_NAME,
  appDomain: APP_DOMAIN,
  appUrl: APP_URL,
  supportEmail: SUPPORT_EMAIL,
  socialHandles: SOCIAL_HANDLES,
  defaultMetro: DEFAULT_METRO,
  defaultCity: DEFAULT_CITY,
  defaultCitySlug: DEFAULT_CITY_SLUG,
  assistantTitle: PUBLIC_ASSISTANT_TITLE,
  tipPlatformFeeBps: TIP_PLATFORM_FEE_BPS,
  tipPlatformFeeRate: TIP_PLATFORM_FEE_RATE,
  kjPayoutMinimumCents: KJ_PAYOUT_MINIMUM_CENTS,
  freshnessVerifyDays: FRESHNESS_VERIFY_DAYS,
  freshnessArchiveDays: FRESHNESS_ARCHIVE_DAYS,
  pricing: PRICING_TIERS,
  tokens: DESIGN_TOKENS,
} as const;

/** Helper to calculate exact tip fee math in cents */
export function calculateTipBreakdown(grossCents: number) {
  const safeGross = Math.max(0, Math.round(grossCents));
  const platformFeeCents = Math.round(
    (safeGross * TIP_PLATFORM_FEE_BPS) / 10000
  );
  const netKjCents = safeGross - platformFeeCents;
  return {
    grossCents: safeGross,
    platformFeeBps: TIP_PLATFORM_FEE_BPS,
    platformFeeCents,
    netKjCents,
    grossDollars: (safeGross / 100).toFixed(2),
    platformFeeDollars: (platformFeeCents / 100).toFixed(2),
    netKjDollars: (netKjCents / 100).toFixed(2),
  };
}

/** Helper to evaluate payout eligibility against $25.00 batch minimum */
export function evaluatePayoutStatus(availableBalanceCents: number) {
  const eligible = availableBalanceCents >= KJ_PAYOUT_MINIMUM_CENTS;
  const remainingCents = Math.max(
    0,
    KJ_PAYOUT_MINIMUM_CENTS - availableBalanceCents
  );
  return {
    availableBalanceCents,
    minimumCents: KJ_PAYOUT_MINIMUM_CENTS,
    eligible,
    remainingCents,
    remainingDollars: (remainingCents / 100).toFixed(2),
    statusLabel: eligible
      ? "Ready for Monthly Batch Payout"
      : `$${(remainingCents / 100).toFixed(2)} away from $${(
          KJ_PAYOUT_MINIMUM_CENTS / 100
        ).toFixed(2)} payout minimum`,
  };
}
