import {
  FRESHNESS_ARCHIVE_DAYS,
  FRESHNESS_VERIFY_DAYS,
} from "@/config/brand";

export type PosterAsSourceStatus =
  | "none"
  | "ask_the_poster"
  | "draft_outreach_ready"
  | "verified_by_poster";

export interface SourceProvenanceRecord {
  sourceUrl: string;
  sourcePlatform: string;
  sourceContext: string;
  posterName: string;
  /** OS-INTERNAL ONLY: an individual's profile link never renders on a public page */
  posterProfileUrl: string;
  /** Contact info ONLY when the source itself states it (phone/email on flyer; public handle) */
  sourceContactInfo: string;
  capturedDate: string;
  posterAsSourceStatus: PosterAsSourceStatus;
  /** Drafts-first outreach text (never sent without Alex's approval) */
  posterOutreachDraft?: string;
}

export interface RawCsvVenueNightRow {
  csvRowNumber: number;
  venue_name: string;
  neighborhood_city: string;
  address: string;
  day_of_week: string;
  start_time: string;
  type: "karaoke" | "open mic" | "live_band";
  host_or_KJ: string;
  primary_genre: string;
  also_welcome: string;
  not_a_fit: string;
  genre_basis: string;
  signup_method: string;
  cover: string;
  age: string;
  source_url: string;
  last_confirmed: string;
  confidence: "verified" | "needs_verification";
  phone: string;
  venue_website: string;
  facebook: string;
  instagram: string;
}

export type FreshnessStatus = "verified_fresh" | "call_to_confirm" | "expired_90d";

export interface NightRecord {
  id: string;
  csvRowNumber: number;
  slug: string;
  roomCode: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  canonicalVenueName: string;
  neighborhood: string;
  address: string;
  lat: number | null;
  lng: number | null;
  geocodeStatus: "geocoded" | "missing_address" | "failed";
  dayOfWeek: string;
  rawDayOfWeek: string;
  startTime: string;
  rawStartTime: string;
  endTime: string;
  nightType: "karaoke" | "open_mic" | "live_band";
  nightTypeLabel: "Karaoke" | "Open Mic" | "Live Band";
  formatType:
    | "Open Bar Karaoke"
    | "Private Rooms"
    | "Live Band Karaoke"
    | "Open Mic Stage"
    | "Live Band Residency";
  hostOrKj: string;
  hostSlug: string | null;
  tenantId: string | null;
  primaryGenre: string;
  alsoWelcome: string;
  notAFit: string;
  genreVibeTags: string;
  genreBasis: string;
  assertedBy: "venue" | "kj" | "crowd_report" | "editorial_source";
  signupMethod: string;
  cover: string;
  agePolicy: string;
  sourceUrl: string;
  lastConfirmedText: string;
  lastVerifiedAt: string;
  daysSinceConfirmed: number;
  freshnessStatus: FreshnessStatus;
  confidence: "verified" | "needs_verification" | "archived";
  phone: string;
  venueWebsite: string;
  facebook: string;
  instagram: string;
  /** Amendment 4 — OS Source Provenance & Poster-as-Source Rule */
  sourcePlatform?: string;
  sourceContext?: string;
  posterName?: string;
  /** OS-INTERNAL ONLY: never rendered on a public page */
  posterProfileUrl?: string;
  /** Contact info ONLY when the source itself states it */
  sourceContactInfo?: string;
  capturedDate?: string;
  posterAsSourceStatus?: PosterAsSourceStatus;
  posterOutreachDraft?: string;
}

export interface VenueGroup {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number | null;
  lng: number | null;
  geocodeStatus: "geocoded" | "missing_address" | "failed";
  phone: string;
  website: string;
  facebook: string;
  instagram: string;
  claimedByTenantId: string | null;
  nights: NightRecord[];
}

export interface HostProfile {
  id: string;
  slug: string;
  tenantId: string;
  displayName: string;
  companyName: string;
  performerType: "kj" | "artist" | "band";
  bio: string;
  homeCity: string;
  genresSupported: string[];
  isFoundingKj: boolean;
  planTier: "free" | "kj_pro_founder" | "kj_pro";
  smsSegmentsUsed: number;
  smsSegmentsCap: number;
  followerCount: number;
  availableBalanceCents: number;
  nights: NightRecord[];
}

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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function computeFreshness(
  lastVerifiedAtIso: string,
  referenceDate: Date = new Date("2026-10-31T12:00:00Z")
): { daysSinceConfirmed: number; freshnessStatus: FreshnessStatus } {
  const verifiedTime = new Date(lastVerifiedAtIso).getTime();
  const diffMs = Math.max(0, referenceDate.getTime() - verifiedTime);
  const daysSinceConfirmed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysSinceConfirmed >= FRESHNESS_ARCHIVE_DAYS) {
    return { daysSinceConfirmed, freshnessStatus: "expired_90d" };
  }
  if (daysSinceConfirmed >= FRESHNESS_VERIFY_DAYS) {
    return { daysSinceConfirmed, freshnessStatus: "call_to_confirm" };
  }
  return { daysSinceConfirmed, freshnessStatus: "verified_fresh" };
}

/**
 * HARD RULE 1 — Genre Truthfulness Filter:
 * A night whose fit for the requested genre is UNKNOWN must NEVER match a genre filter!
 */
export function matchesGenreFilter(
  night: Pick<NightRecord, "primaryGenre" | "alsoWelcome" | "notAFit">,
  selectedGenre?: string | null
): { matches: boolean; fitLevel: "primary" | "welcome" | "unfiltered" | "none" } {
  if (!selectedGenre || selectedGenre === "ALL" || selectedGenre.trim() === "") {
    return { matches: true, fitLevel: "unfiltered" };
  }

  const primary = (night.primaryGenre || "UNKNOWN").trim();
  const welcome = (night.alsoWelcome || "UNKNOWN").trim();

  if (
    primary.toUpperCase() === "UNKNOWN" &&
    welcome.toUpperCase() === "UNKNOWN"
  ) {
    return { matches: false, fitLevel: "none" };
  }

  const query = selectedGenre.toLowerCase().trim();

  const synonyms: Record<string, string[]> = {
    "hip-hop/rap": ["hip-hop", "hip hop", "rap", "rappers"],
    "hip-hop": ["hip-hop", "hip hop", "rap", "rappers"],
    "r&b/soul": ["r&b", "soul"],
    "r&b": ["r&b", "soul"],
    rock: ["rock", "indie", "80s hair-band"],
    "metal/punk": ["metal", "punk", "heavy metal"],
    country: ["country"],
    "pop/top 40": ["top 40", "pop"],
    "throwbacks/oldies": ["throwbacks", "pre-2004", "1970s", "80s", "oldies"],
    comedy: ["comedy", "stand-up"],
    "poetry/spoken word": ["poetry", "poets", "spoken word"],
    "acoustic/folk": ["acoustic", "folk", "singer-songwriter", "bluegrass"],
    blues: ["blues"],
    "brass band": ["brass", "brass band"],
    gospel: ["gospel"],
    "all genres": ["all genres"],
    originals: ["original", "originals", "singer-songwriter"],
    covers: ["cover", "covers"],
  };

  const tokens = synonyms[query] || [query];

  const primaryLower = primary.toLowerCase();
  if (
    primary.toUpperCase() !== "UNKNOWN" &&
    tokens.some((t) => primaryLower.includes(t))
  ) {
    return { matches: true, fitLevel: "primary" };
  }

  const welcomeLower = welcome.toLowerCase();
  if (
    welcome.toUpperCase() !== "UNKNOWN" &&
    tokens.some((t) => welcomeLower.includes(t))
  ) {
    return { matches: true, fitLevel: "welcome" };
  }

  return { matches: false, fitLevel: "none" };
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

/**
 * Returns the live current day of week in Cleveland, OH (America/New_York timezone).
 */
export function getClevelandCurrentDayOfWeek(now: Date = new Date()): WeekdayName {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(now);
  return (
    WEEKDAYS.find((d) => d.toLowerCase() === formatted.toLowerCase()) ||
    "Monday"
  );
}

/**
 * Returns tomorrow's day of week in Cleveland, OH (America/New_York timezone).
 */
export function getClevelandTomorrowDayOfWeek(now: Date = new Date()): WeekdayName {
  const today = getClevelandCurrentDayOfWeek(now);
  const idx = WEEKDAYS.findIndex(
    (d) => d.toLowerCase() === today.toLowerCase()
  );
  return WEEKDAYS[(idx + 1) % 7] || "Tuesday";
}

export function matchesDayFilter(
  night: Pick<NightRecord, "dayOfWeek" | "formatType">,
  selectedDay?: string | null,
  referenceDate: Date = new Date()
): boolean {
  if (!selectedDay || selectedDay === "ALL" || selectedDay.trim() === "") {
    return true;
  }
  const day = night.dayOfWeek;
  if (!day || day.toUpperCase() === "UNKNOWN") {
    return false;
  }
  const rawTarget = selectedDay.toLowerCase().trim();
  const dayLower = day.toLowerCase().trim();

  if (rawTarget === "weekend" || rawTarget === "this weekend") {
    return (
      dayLower.startsWith("friday") ||
      dayLower.startsWith("saturday") ||
      dayLower.startsWith("sunday") ||
      dayLower === "thursday-sunday"
    );
  }

  const target =
    rawTarget === "tonight"
      ? getClevelandCurrentDayOfWeek(referenceDate).toLowerCase()
      : rawTarget === "tomorrow"
      ? getClevelandTomorrowDayOfWeek(referenceDate).toLowerCase()
      : rawTarget;

  if (dayLower === "thursday-sunday") {
    return ["thursday", "friday", "saturday", "sunday"].includes(target);
  }
  return dayLower.startsWith(target);
}

export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
