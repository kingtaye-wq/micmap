import {
  NightRecord,
  VenueGroup,
  HostProfile,
  loadClevelandSeedFromCsv,
  computeFreshness,
  parseIntakeCsvRows,
} from "./csv-parser";
import {
  calculateTipBreakdown,
  evaluatePayoutStatus,
  KJ_PAYOUT_MINIMUM_CENTS,
} from "@/config/brand";

export interface TestAccount {
  id: string;
  email: string;
  passwordHint: string;
  displayName: string;
  role: "admin" | "kj" | "venue" | "fan";
  tenantId: string;
  hostSlug?: string;
  venueSlug?: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    id: "user-admin",
    email: "admin@micmap.co",
    passwordHint: "MicMapAdmin2026!",
    displayName: "Alex / Admin Operator",
    role: "admin",
    tenantId: "00000000-0000-4000-8000-000000000001",
  },
  {
    id: "user-kj-a",
    email: "meshell@shellyeahevents.com",
    passwordHint: "ShellYeahKJ_A_2026!",
    displayName: "KJ Meshell (Shell Yeah Events)",
    role: "kj",
    tenantId: "11111111-1111-4111-8111-111111111101",
    hostSlug: "shell-yeah-events-by-meshell",
  },
  {
    id: "user-kj-b",
    email: "aj@strongstylekaraoke.com",
    passwordHint: "StrongStyleKJ_B_2026!",
    displayName: "KJ A.J. Vedda (Strong Style Karaoke)",
    role: "kj",
    tenantId: "11111111-1111-4111-8111-111111111102",
    hostSlug: "strong-style-karaoke",
  },
  {
    id: "user-fan",
    email: "fan@micmap.co",
    passwordHint: "CleNightlifeFan2026!",
    displayName: "Jordan Vance (Cleveland Performer)",
    role: "fan",
    tenantId: "33333333-3333-4333-8333-333333333301",
  },
];

export interface ClaimItem {
  id: string;
  targetType: "venue" | "night" | "person";
  targetId: string;
  targetName: string;
  claimantName: string;
  claimantEmail: string;
  claimantRole: string;
  socialOrWebProof: string;
  assertedPrimaryGenre: string;
  assertedAlsoWelcome: string;
  assertedNotAFit: string;
  scheduleNotes: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
}

export interface CorrectionItem {
  id: string;
  nightId: string;
  venueName: string;
  fieldName:
    | "primaryGenre"
    | "alsoWelcome"
    | "notAFit"
    | "startTime"
    | "dayOfWeek"
    | "hostOrKj"
    | "signupMethod";
  proposedValue: string;
  sourceOrBasis: string;
  submitterRole: "venue" | "kj" | "crowd_report";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface SongRequestItem {
  id: string;
  roomCode: string;
  nightId: string;
  venueName: string;
  singerStageName: string;
  songTitle: string;
  artistName: string;
  notesKeyChange: string;
  tipBoostCents: number;
  platformFeeCents: number;
  netKjCents: number;
  notifyContact: string;
  status: "queued" | "up_next" | "now_singing" | "completed" | "skipped";
  createdAt: string;
}

export interface TipRecord {
  id: string;
  stripePaymentIntentId: string;
  recipientType: "kj" | "artist" | "crew";
  recipientSlug: string;
  recipientName: string;
  tenantId: string;
  roomCode: string;
  tipperName: string;
  grossCents: number;
  platformFeeBps: number;
  platformFeeCents: number;
  netKjCents: number;
  payoutStatus: "accumulating" | "queued_for_monthly_batch" | "paid";
  createdAt: string;
}

export interface FollowRecord {
  id: string;
  followerEmail: string;
  followerPhone?: string;
  smsOptIn: boolean;
  targetType: "person" | "venue" | "crew";
  targetSlug: string;
  targetName: string;
  tenantId: string;
  stopped: boolean;
  createdAt: string;
}

export interface PromotionRecord {
  id: string;
  venueSlug: string;
  venueName: string;
  tenantId: string;
  title: string;
  promoCategory:
    | "Food Special"
    | "Late Night Happy Hour"
    | "Theme Night"
    | "Featured Listing";
  compType: "cash_platform" | "food_kitchen" | "non_alcoholic" | "cover_split";
  description: string;
  active: boolean;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  targetType: "profile" | "night" | "photo";
  targetId: string;
  targetLabel: string;
  reason: string;
  status: "open" | "hidden" | "dismissed";
  createdAt: string;
}

export interface NotificationEventItem {
  id: string;
  tenantId: string;
  eventType:
    | "follow_confirmation"
    | "tonight_alert"
    | "claim_submitted"
    | "claim_approved"
    | "queue_two_away"
    | "design_change_request";
  channel: "email" | "sms";
  recipient: string;
  subject: string;
  smsSegments: number;
  ghlSyncStatus: "queued_internal" | "skipped_opt_out";
  createdAt: string;
}

export interface ArtistOrCrewProfile {
  id: string;
  slug: string;
  kind: "artist" | "crew";
  tenantId: string;
  displayName: string;
  bio: string;
  homeCity: string;
  genres: string[];
  members?: string[];
  followerCount: number;
  rawRsvpCount: number;
  rawCheckinCount: number;
  venueConfirmationsCount: number;
  upcomingAppearances: {
    nightSlug: string;
    venueName: string;
    dayOfWeek: string;
    startTime: string;
  }[];
}

export interface IntakeBatchRecord {
  id: string;
  source: string;
  intakeDate: string;
  rowsImported: number;
  rowIds: string[];
  createdAt: string;
}

export interface MicMapStoreState {
  nights: NightRecord[];
  venues: VenueGroup[];
  hosts: HostProfile[];
  artistsAndCrews: ArtistOrCrewProfile[];
  claims: ClaimItem[];
  corrections: CorrectionItem[];
  songRequests: SongRequestItem[];
  tips: TipRecord[];
  follows: FollowRecord[];
  promotions: PromotionRecord[];
  moderationReports: ModerationReport[];
  notificationEvents: NotificationEventItem[];
  intakeBatches?: IntakeBatchRecord[];
  checkIns: {
    id: string;
    nightId: string;
    venueName: string;
    performerName: string;
    roomCode: string;
    createdAt: string;
  }[];
}

const BANNED_ALCOHOL_TERMS = [
  "free drink",
  "free drinks",
  "drink ticket",
  "drink tickets",
  "drink coin",
  "drink coins",
  "free beer",
  "free shot",
  "free shots",
  "alcohol prize",
  "complimentary alcohol",
  "2-for-1",
];

export function containsBannedAlcoholCompLanguage(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return BANNED_ALCOHOL_TERMS.some((term) => lower.includes(term));
}

const BASIC_PROFANITY_LIST = ["slurplaceholder1", "slurplaceholder2"];
export function sanitizePublicText(text: string): string {
  let out = text;
  for (const word of BASIC_PROFANITY_LIST) {
    const regex = new RegExp(word, "gi");
    out = out.replace(regex, "***");
  }
  return out;
}

function createInitialStore(): MicMapStoreState {
  const { nights, venues, hosts } = loadClevelandSeedFromCsv();

  const artistsAndCrews: ArtistOrCrewProfile[] = [
    {
      id: "artist-ant-morrow",
      slug: "ant-morrow",
      kind: "artist",
      tenantId: "11111111-1111-4111-8111-111111111106",
      displayName: "Ant Morrow",
      bio: "Host & curator of Lyrical Rhythms at B Side Lounge in Coventry — Cleveland's premier open mic for performance poetry, hip-hop soul, and live band backing.",
      homeCity: "Cleveland, OH",
      genres: ["Poetry/Spoken Word", "Hip-Hop/Rap", "R&B/Soul"],
      followerCount: 196,
      rawRsvpCount: 64,
      rawCheckinCount: 41,
      venueConfirmationsCount: 12,
      upcomingAppearances: [
        {
          nightSlug: "b-side-lounge-lyrical-rhythms-tuesday",
          venueName: "B Side Lounge (Lyrical Rhythms)",
          dayOfWeek: "Tuesday",
          startTime: "10:00 PM",
        },
      ],
    },
    {
      id: "artist-brent-kirby",
      slug: "brent-kirby",
      kind: "artist",
      tenantId: "11111111-1111-4111-8111-111111111107",
      displayName: "Brent Kirby",
      bio: "Cleveland singer-songwriter and host of the 10x3 Songwriter/Band Showcase at BOP STOP at The Music Settlement (1st & 3rd Wednesdays).",
      homeCity: "Cleveland, OH",
      genres: ["Originals", "Acoustic/Folk", "Rock"],
      followerCount: 164,
      rawRsvpCount: 52,
      rawCheckinCount: 38,
      venueConfirmationsCount: 15,
      upcomingAppearances: [
        {
          nightSlug: "bop-stop-at-the-music-settlement-wednesday-1st-3rd",
          venueName: "BOP STOP at The Music Settlement",
          dayOfWeek: "Wednesday (1st & 3rd)",
          startTime: "7:00 PM",
        },
      ],
    },
    {
      id: "crew-coventry-cipher-collective",
      slug: "coventry-cipher-collective",
      kind: "crew",
      tenantId: "44444444-4444-4444-8444-444444444401",
      displayName: "Coventry Cipher & Soul Collective",
      bio: "East Side vocalists, MCs, and spoken-word performers rolling 8-deep to Tuesday and Wednesday open mics & karaoke stages across Cleveland Heights and Tremont.",
      homeCity: "Cleveland, OH",
      genres: ["Hip-Hop/Rap", "R&B/Soul", "Poetry/Spoken Word"],
      members: ["Ant Morrow", "Maya Lin", "Darius Cole", "Kendra Vee"],
      followerCount: 312,
      rawRsvpCount: 94,
      rawCheckinCount: 67,
      venueConfirmationsCount: 9,
      upcomingAppearances: [
        {
          nightSlug: "b-side-lounge-lyrical-rhythms-tuesday",
          venueName: "B Side Lounge (Lyrical Rhythms)",
          dayOfWeek: "Tuesday",
          startTime: "10:00 PM",
        },
        {
          nightSlug: "flying-monkey-pub-sunday",
          venueName: "Flying Monkey Pub",
          dayOfWeek: "Sunday",
          startTime: "8:30 PM",
        },
      ],
    },
    {
      id: "crew-lakewood-late-shift",
      slug: "lakewood-late-shift",
      kind: "crew",
      tenantId: "44444444-4444-4444-8444-444444444402",
      displayName: "Lakewood Late Shift Singers",
      bio: "West Side karaoke regulars hitting Detroit Ave & Madison Ave stages every Thursday, Friday, and Sunday night.",
      homeCity: "Lakewood, OH",
      genres: ["Rock", "Throwbacks/Oldies", "Pop/Top 40", "All Genres"],
      members: ["Elena Rossi", "Marcus Vance", "Tori Bell"],
      followerCount: 185,
      rawRsvpCount: 58,
      rawCheckinCount: 44,
      venueConfirmationsCount: 7,
      upcomingAppearances: [
        {
          nightSlug: "time-warp-bar-thursday",
          venueName: "Time Warp Bar",
          dayOfWeek: "Thursday",
          startTime: "9:00 PM",
        },
        {
          nightSlug: "tinas-nite-club-friday",
          venueName: "Tina's Nite Club",
          dayOfWeek: "Friday",
          startTime: "9:00 PM",
        },
      ],
    },
  ];

  const songRequests: SongRequestItem[] = [
    {
      id: "sr-1",
      roomCode: "CLE-018",
      nightId: "night-18",
      venueName: "Time Warp Bar",
      singerStageName: "Maya R.",
      songTitle: "Valerie",
      artistName: "Amy Winehouse",
      notesKeyChange: "Standard key",
      tipBoostCents: 1000,
      platformFeeCents: 50,
      netKjCents: 950,
      notifyContact: "216-555-0142",
      status: "now_singing",
      createdAt: "2026-10-31T21:15:00Z",
    },
    {
      id: "sr-2",
      roomCode: "CLE-018",
      nightId: "night-18",
      venueName: "Time Warp Bar",
      singerStageName: "Darius C.",
      songTitle: "Return of the Mack",
      artistName: "Mark Morrison",
      notesKeyChange: "Bring the mic stand down",
      tipBoostCents: 1000,
      platformFeeCents: 50,
      netKjCents: 950,
      notifyContact: "216-555-0188",
      status: "up_next",
      createdAt: "2026-10-31T21:20:00Z",
    },
    {
      id: "sr-3",
      roomCode: "CLE-018",
      nightId: "night-18",
      venueName: "Time Warp Bar",
      singerStageName: "Tori B.",
      songTitle: "Mr. Brightside",
      artistName: "The Killers",
      notesKeyChange: "Original key",
      tipBoostCents: 0,
      platformFeeCents: 0,
      netKjCents: 0,
      notifyContact: "",
      status: "queued",
      createdAt: "2026-10-31T21:24:00Z",
    },
  ];

  const tips: TipRecord[] = [
    {
      id: "tip-1",
      stripePaymentIntentId: "pi_test_cle_meshell_001",
      recipientType: "kj",
      recipientSlug: "shell-yeah-events-by-meshell",
      recipientName: "KJ Meshell (Shell Yeah Events by MeShell)",
      tenantId: "11111111-1111-4111-8111-111111111101",
      roomCode: "CLE-018",
      tipperName: "Maya R.",
      grossCents: 1000,
      platformFeeBps: 500,
      platformFeeCents: 50,
      netKjCents: 950,
      payoutStatus: "accumulating",
      createdAt: "2026-10-31T21:15:00Z",
    },
    {
      id: "tip-2",
      stripePaymentIntentId: "pi_test_cle_meshell_002",
      recipientType: "kj",
      recipientSlug: "shell-yeah-events-by-meshell",
      recipientName: "KJ Meshell (Shell Yeah Events by MeShell)",
      tenantId: "11111111-1111-4111-8111-111111111101",
      roomCode: "CLE-018",
      tipperName: "Darius C.",
      grossCents: 1000,
      platformFeeBps: 500,
      platformFeeCents: 50,
      netKjCents: 950,
      payoutStatus: "accumulating",
      createdAt: "2026-10-31T21:20:00Z",
    },
    {
      id: "tip-3",
      stripePaymentIntentId: "pi_test_cle_strongstyle_001",
      recipientType: "kj",
      recipientSlug: "strong-style-karaoke",
      recipientName: "Strong Style Karaoke",
      tenantId: "11111111-1111-4111-8111-111111111102",
      roomCode: "CLE-084",
      tipperName: "Lakewood Crew",
      grossCents: 3500,
      platformFeeBps: 500,
      platformFeeCents: 175,
      netKjCents: 3325,
      payoutStatus: "queued_for_monthly_batch",
      createdAt: "2026-10-30T23:10:00Z",
    },
  ];

  const follows: FollowRecord[] = [
    {
      id: "fol-1",
      followerEmail: "maya.singer@example.com",
      followerPhone: "216-555-0142",
      smsOptIn: true,
      targetType: "person",
      targetSlug: "shell-yeah-events-by-meshell",
      targetName: "KJ Meshell (Shell Yeah Events by MeShell)",
      tenantId: "11111111-1111-4111-8111-111111111101",
      stopped: false,
      createdAt: "2026-10-29T19:00:00Z",
    },
    {
      id: "fol-2",
      followerEmail: "darius.mc@example.com",
      followerPhone: "216-555-0188",
      smsOptIn: true,
      targetType: "person",
      targetSlug: "shell-yeah-events-by-meshell",
      targetName: "KJ Meshell (Shell Yeah Events by MeShell)",
      tenantId: "11111111-1111-4111-8111-111111111101",
      stopped: false,
      createdAt: "2026-10-30T14:20:00Z",
    },
    {
      id: "fol-3",
      followerEmail: "westside.rocker@example.com",
      followerPhone: "440-555-0199",
      smsOptIn: true,
      targetType: "person",
      targetSlug: "strong-style-karaoke",
      targetName: "Strong Style Karaoke",
      tenantId: "11111111-1111-4111-8111-111111111102",
      stopped: false,
      createdAt: "2026-10-28T20:10:00Z",
    },
  ];

  const claims: ClaimItem[] = [
    {
      id: "claim-seed-1",
      targetType: "night",
      targetId: "night-18",
      targetName: "Time Warp Bar — Thursday",
      claimantName: "KJ Meshell",
      claimantEmail: "meshell@shellyeahevents.com",
      claimantRole: "Host / KJ",
      socialOrWebProof: "https://allevents.in/org/shell-yeah-events-by-meshell/25274159",
      assertedPrimaryGenre: "All Genres",
      assertedAlsoWelcome: "Hip-Hop/Rap, R&B/Soul, Rock, Country, Pop/Top 40",
      assertedNotAFit: "None — judgment-free room",
      scheduleNotes: "Every Thursday & Sunday 9:00 PM at Time Warp Bar",
      status: "pending",
      createdAt: "2026-10-31T10:00:00Z",
    },
  ];

  const corrections: CorrectionItem[] = [
    {
      id: "corr-seed-1",
      nightId: "night-1",
      venueName: "Corky's Place (Monday)",
      fieldName: "primaryGenre",
      proposedValue: "Pop/Top 40",
      sourceOrBasis: "Regular Monday crowd sings 90s/2000s Pop, Classic Rock, and Country",
      submitterRole: "crowd_report",
      status: "pending",
      createdAt: "2026-10-31T11:30:00Z",
    },
  ];

  const promotions: PromotionRecord[] = [
    {
      id: "promo-1",
      venueSlug: "time-warp-bar",
      venueName: "Time Warp Bar",
      tenantId: "11111111-1111-4111-8111-111111111101",
      title: "Late-Night Kitchen Basket & Non-Alcoholic Performer Refills",
      promoCategory: "Food Special",
      compType: "food_kitchen",
      description:
        "$7 late-night wing & fry baskets until midnight; complimentary fountain soda & coffee refills for checked-in performers.",
      active: true,
      createdAt: "2026-10-30T16:00:00Z",
    },
    {
      id: "promo-2",
      venueSlug: "b-side-lounge",
      venueName: "B Side Lounge",
      tenantId: "11111111-1111-4111-8111-111111111106",
      title: "Lyrical Rhythms Featured Crew Cash Stipend",
      promoCategory: "Theme Night",
      compType: "cash_platform",
      description:
        "$75 platform cash stipend via Stripe Connect for verified crews bringing 8+ checked-in supporters.",
      active: true,
      createdAt: "2026-10-30T18:00:00Z",
    },
  ];

  const moderationReports: ModerationReport[] = [
    {
      id: "mod-1",
      targetType: "night",
      targetId: "night-106",
      targetLabel: "Kava Sol — Wednesday",
      reason: "Google listing flags venue as possibly closed; needs admin check.",
      status: "open",
      createdAt: "2026-10-31T09:00:00Z",
    },
  ];

  const notificationEvents: NotificationEventItem[] = [
    {
      id: "notif-1",
      tenantId: "11111111-1111-4111-8111-111111111101",
      eventType: "tonight_alert",
      channel: "email",
      recipient: "maya.singer@example.com",
      subject: "KJ Meshell is live at Time Warp Bar (Westlake) at 9:00 PM",
      smsSegments: 0,
      ghlSyncStatus: "queued_internal",
      createdAt: "2026-10-31T17:00:00Z",
    },
  ];

  return {
    nights,
    venues,
    hosts,
    artistsAndCrews,
    claims,
    corrections,
    songRequests,
    tips,
    follows,
    promotions,
    moderationReports,
    notificationEvents,
    intakeBatches: [],
    checkIns: [
      {
        id: "chk-1",
        nightId: "night-18",
        venueName: "Time Warp Bar",
        performerName: "KJ Meshell",
        roomCode: "CLE-018",
        createdAt: "2026-10-31T20:45:00Z",
      },
    ],
  };
}

const SUPABASE_STAGING_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://iwtqkzcwfiertrlhvkhn.supabase.co";

const SUPABASE_STAGING_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dHFremN3ZmllcnRybGh2a2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODE3MDIsImV4cCI6MjA5Nzk1NzcwMn0.Zd9pXsQJWlvr1N2nlRGgUJE54l-MMAMnNv9sBZck_1A";

function getSupabaseHeaders(prefer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_STAGING_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_STAGING_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) {
    headers["Prefer"] = prefer;
  }
  return headers;
}

const globalForMicMap = globalThis as unknown as {
  __micMapStore?: MicMapStoreState;
};

export function getStore(): MicMapStoreState {
  if (!globalForMicMap.__micMapStore) {
    globalForMicMap.__micMapStore = createInitialStore();
  }
  return globalForMicMap.__micMapStore;
}

export function resetStore(): MicMapStoreState {
  globalForMicMap.__micMapStore = createInitialStore();
  return globalForMicMap.__micMapStore;
}

/**
 * Upsert relational night rows into public.micmap_staging_nights in Supabase Postgres
 */
export async function upsertNightsToSupabase(
  nights: NightRecord[]
): Promise<void> {
  if (!nights || nights.length === 0) return;
  try {
    const rows = nights.map((n) => ({
      id: n.id,
      row_number: n.csvRowNumber,
      venue_name: n.venueName,
      venue_slug: n.venueSlug,
      night_slug: n.slug,
      event_type: n.nightType,
      confidence:
        n.confidence === "verified" ? "verified" : "needs_verification",
      neighborhood: n.neighborhood,
      address: n.address,
      lat: n.lat,
      lng: n.lng,
      geocode_status: n.geocodeStatus,
      day_of_week: n.dayOfWeek,
      start_time: n.startTime,
      host_or_kj: n.hostOrKj,
      primary_genre: n.primaryGenre,
      last_confirmed_text: n.lastConfirmedText,
      last_verified_at: n.lastVerifiedAt,
      payload: n,
      updated_at: new Date().toISOString(),
    }));
    await fetch(`${SUPABASE_STAGING_URL}/rest/v1/micmap_staging_nights`, {
      method: "POST",
      headers: getSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(rows),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[MicMap Supabase] upsertNightsToSupabase error:", err);
  }
}

/**
 * Persist the authoritative store state into public.micmap_staging_store in Supabase Postgres
 */
export async function persistStoreToSupabase(
  store?: MicMapStoreState
): Promise<void> {
  const current = store || getStore();
  globalForMicMap.__micMapStore = current;
  try {
    await fetch(`${SUPABASE_STAGING_URL}/rest/v1/micmap_staging_store`, {
      method: "POST",
      headers: getSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        id: "default",
        state: current,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[MicMap Supabase] persistStoreToSupabase error:", err);
  }
}

/**
 * Pull live store state from Supabase Postgres (public.micmap_staging_store).
 * If not yet seeded in Supabase, seeds the 131 Cleveland rows automatically.
 */
export async function syncStoreFromSupabase(): Promise<MicMapStoreState> {
  try {
    const res = await fetch(
      `${SUPABASE_STAGING_URL}/rest/v1/micmap_staging_store?id=eq.default&select=state,updated_at`,
      {
        method: "GET",
        headers: getSupabaseHeaders(),
        cache: "no-store",
      }
    );
    if (res.ok) {
      const rows = (await res.json()) as { state: MicMapStoreState }[];
      if (rows && rows.length > 0 && rows[0].state?.nights?.length) {
        globalForMicMap.__micMapStore = rows[0].state;
        return rows[0].state;
      }
      // Seed initial store into Supabase
      const initial = createInitialStore();
      globalForMicMap.__micMapStore = initial;
      await persistStoreToSupabase(initial);
      await upsertNightsToSupabase(initial.nights);
      return initial;
    }
  } catch (err) {
    console.error("[MicMap Supabase] syncStoreFromSupabase error:", err);
  }
  return getStore();
}

/**
 * Reset store in memory AND in live Supabase Postgres back to the clean 131 Cleveland seed state
 */
export async function resetStoreLive(): Promise<MicMapStoreState> {
  const fresh = createInitialStore();
  globalForMicMap.__micMapStore = fresh;
  try {
    // Delete any imported intake rows beyond row 131 in micmap_staging_nights
    await fetch(
      `${SUPABASE_STAGING_URL}/rest/v1/micmap_staging_nights?row_number=gt.131`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders("return=minimal"),
        cache: "no-store",
      }
    );
  } catch {
    // ignore
  }
  await persistStoreToSupabase(fresh);
  await upsertNightsToSupabase(fresh.nights);
  return fresh;
}

/**
 * Import update-intake CSV rows into confidence = "needs_verification" in Supabase Postgres
 */
export async function importIntakeCsvToQueue(params: {
  csvContent: string;
  source: string;
  intakeDate: string;
}): Promise<{ importedNights: NightRecord[]; batch: IntakeBatchRecord }> {
  const store = await syncStoreFromSupabase();
  const maxRow = store.nights.reduce(
    (max, n) => Math.max(max, n.csvRowNumber || 0),
    131
  );
  const importedNights = parseIntakeCsvRows({
    csvContent: params.csvContent,
    startingRowNumber: maxRow + 1,
    source: params.source,
    intakeDate: params.intakeDate,
  });

  if (importedNights.length > 0) {
    store.nights.push(...importedNights);
  }

  const batch: IntakeBatchRecord = {
    id: `intake-${Date.now()}`,
    source: params.source,
    intakeDate: params.intakeDate,
    rowsImported: importedNights.length,
    rowIds: importedNights.map((n) => n.id),
    createdAt: new Date().toISOString(),
  };

  if (!store.intakeBatches) {
    store.intakeBatches = [];
  }
  store.intakeBatches.unshift(batch);

  await persistStoreToSupabase(store);
  if (importedNights.length > 0) {
    await upsertNightsToSupabase(importedNights);
  }
  try {
    await fetch(
      `${SUPABASE_STAGING_URL}/rest/v1/micmap_staging_intake_batches`,
      {
        method: "POST",
        headers: getSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify({
          id: batch.id,
          source: batch.source,
          intake_date: batch.intakeDate,
          rows_imported: batch.rowsImported,
          row_ids: batch.rowIds,
          created_at: batch.createdAt,
        }),
        cache: "no-store",
      }
    );
  } catch {
    // ignore
  }

  return { importedNights, batch };
}

/**
 * Returns ONLY verified public nights that have not exceeded the 90-day freshness window.
 * Per mvp-build-packet.md §3 & §8:
 * - Only rows with confidence === "verified" publish on public discovery.
 * - Rows >= 90 days since lastVerifiedAt leave the public map (retained in admin).
 */
export function getPublicVerifiedNights(): NightRecord[] {
  const store = getStore();
  return store.nights.filter(
    (n) =>
      n.confidence === "verified" && n.freshnessStatus !== "expired_90d"
  );
}

/**
 * Returns the 58 needs_verification rows in the admin verification queue.
 */
export function getAdminVerificationQueue(): NightRecord[] {
  const store = getStore();
  return store.nights.filter((n) => n.confidence === "needs_verification");
}

/**
 * Promote a needs_verification night to verified (Admin "Verify & Publish" action)
 */
export function verifyAndPublishNight(nightId: string): NightRecord | null {
  const store = getStore();
  const night = store.nights.find((n) => n.id === nightId);
  if (!night) return null;

  night.confidence = "verified";
  night.lastVerifiedAt = new Date("2026-10-31T12:00:00Z").toISOString();
  night.lastConfirmedText = "Verified by Admin on 2026-10-31";
  const { daysSinceConfirmed, freshnessStatus } = computeFreshness(
    night.lastVerifiedAt
  );
  night.daysSinceConfirmed = daysSinceConfirmed;
  night.freshnessStatus = freshnessStatus;
  return night;
}

/**
 * Update a night's lastVerifiedAt (for freshness testing of 45d warning badge & 90d auto-removal)
 */
export function setNightDaysAgoConfirmed(
  nightId: string,
  daysAgo: number
): NightRecord | null {
  const store = getStore();
  const night = store.nights.find((n) => n.id === nightId);
  if (!night) return null;

  const refDate = new Date("2026-10-31T12:00:00Z");
  const targetDate = new Date(
    refDate.getTime() - daysAgo * 24 * 60 * 60 * 1000
  );
  night.lastVerifiedAt = targetDate.toISOString();
  night.lastConfirmedText = `Confirmed ${daysAgo} days ago`;
  const { daysSinceConfirmed, freshnessStatus } = computeFreshness(
    night.lastVerifiedAt,
    refDate
  );
  night.daysSinceConfirmed = daysSinceConfirmed;
  night.freshnessStatus = freshnessStatus;
  return night;
}

/**
 * Record a tip with 5% platform fee and $25.00 batch payout minimum logic
 */
export function recordTipPayment(params: {
  recipientType?: "kj" | "artist" | "crew";
  recipientSlug: string;
  recipientName: string;
  roomCode: string;
  tipperName: string;
  grossCents: number;
}): {
  tip: TipRecord;
  hostBalanceCents: number;
  payoutEvaluation: ReturnType<typeof evaluatePayoutStatus>;
} {
  const store = getStore();
  const breakdown = calculateTipBreakdown(params.grossCents);
  const host = store.hosts.find((h) => h.slug === params.recipientSlug);
  const tenantId = host?.tenantId || "11111111-1111-4111-8111-111111111101";

  const currentBalance = host ? host.availableBalanceCents : 0;
  const newBalance = currentBalance + breakdown.netKjCents;
  if (host) {
    host.availableBalanceCents = newBalance;
  }

  const payoutEval = evaluatePayoutStatus(newBalance);

  const tip: TipRecord = {
    id: `tip-${Date.now()}`,
    stripePaymentIntentId: `pi_test_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    recipientType: params.recipientType || "kj",
    recipientSlug: params.recipientSlug,
    recipientName: params.recipientName,
    tenantId,
    roomCode: params.roomCode,
    tipperName: params.tipperName || "Anonymous Supporter",
    grossCents: breakdown.grossCents,
    platformFeeBps: breakdown.platformFeeBps,
    platformFeeCents: breakdown.platformFeeCents,
    netKjCents: breakdown.netKjCents,
    payoutStatus:
      newBalance >= KJ_PAYOUT_MINIMUM_CENTS
        ? "queued_for_monthly_batch"
        : "accumulating",
    createdAt: new Date().toISOString(),
  };

  store.tips.unshift(tip);

  // If balance crossed $25.00 minimum, mark all accumulating tips for this recipient as queued_for_monthly_batch
  if (payoutEval.eligible) {
    store.tips.forEach((t) => {
      if (
        t.recipientSlug === params.recipientSlug &&
        t.payoutStatus === "accumulating"
      ) {
        t.payoutStatus = "queued_for_monthly_batch";
      }
    });
  }

  return {
    tip,
    hostBalanceCents: newBalance,
    payoutEvaluation: payoutEval,
  };
}
