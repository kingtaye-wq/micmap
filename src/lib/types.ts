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

export interface ClevelandCalendarDate {
  year: number;
  month: number; // 1..12
  dayOfMonth: number; // 1..31
  weekday: WeekdayName;
  nthWeekdayOfMonth: number; // 1..5
  isLastWeekdayOfMonth: boolean;
  isoDate: string; // YYYY-MM-DD
}

/**
 * Parse a Date or YYYY-MM-DD date string into a Date anchored at 17:00 UTC (12:00 PM EST / 1:00 PM EDT in America/New_York).
 */
export function parseClevelandDateInput(
  dateOrIso?: Date | string | null
): Date {
  if (!dateOrIso) return new Date();
  if (dateOrIso instanceof Date) {
    return Number.isNaN(dateOrIso.getTime()) ? new Date() : dateOrIso;
  }
  const trimmed = String(dateOrIso).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    return new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Compute calendar date components in America/New_York time, including nth-weekday of the month and whether it is the last occurrence of that weekday in the month.
 */
export function getClevelandCalendarDate(
  dateOrIso: Date | string = new Date()
): ClevelandCalendarDate {
  const d = parseClevelandDateInput(dateOrIso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(d);

  const year = Number(parts.find((p) => p.type === "year")?.value || 2026);
  const month = Number(parts.find((p) => p.type === "month")?.value || 11);
  const dayOfMonth = Number(parts.find((p) => p.type === "day")?.value || 1);
  const rawWeekday = parts.find((p) => p.type === "weekday")?.value || "Monday";
  const weekday =
    WEEKDAYS.find((w) => w.toLowerCase() === rawWeekday.toLowerCase()) ||
    "Monday";

  const nthWeekdayOfMonth = Math.floor((dayOfMonth - 1) / 7) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isLastWeekdayOfMonth = dayOfMonth + 7 > daysInMonth;
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(
    dayOfMonth
  ).padStart(2, "0")}`;

  return {
    year,
    month,
    dayOfMonth,
    weekday,
    nthWeekdayOfMonth,
    isLastWeekdayOfMonth,
    isoDate,
  };
}

/**
 * Returns the live current day of week in Cleveland, OH (America/New_York timezone).
 */
export function getClevelandCurrentDayOfWeek(
  now: Date | string = new Date()
): WeekdayName {
  return getClevelandCalendarDate(now).weekday;
}

/**
 * Returns tomorrow's day of week in Cleveland, OH (America/New_York timezone).
 */
export function getClevelandTomorrowDayOfWeek(
  now: Date | string = new Date()
): WeekdayName {
  const today = getClevelandCurrentDayOfWeek(now);
  const idx = WEEKDAYS.findIndex(
    (d) => d.toLowerCase() === today.toLowerCase()
  );
  return WEEKDAYS[(idx + 1) % 7] || "Tuesday";
}

export interface MonthlyWeekdayQualifier {
  hasNthQualifier: boolean;
  occurrences: number[];
  isLastOfMonth: boolean;
}

/**
 * Parse monthly (nth-weekday) qualifiers from a night's dayOfWeek schedule string:
 * e.g. "Monday (1st Monday of month)", "Wednesday (4th Wednesday)", "Wednesday (2nd & 4th)",
 * "Thursday (1st Thursday)", "Thursday (2nd + 4th Thursday)", "Wednesday (1st & 3rd)",
 * "Tuesday (3rd Tuesday)", "Sunday (last Sunday of month)".
 */
export function parseMonthlyWeekdayQualifier(
  dayOfWeekText: string
): MonthlyWeekdayQualifier {
  const text = (dayOfWeekText || "").toLowerCase();
  const occurrences: number[] = [];

  if (/\b(1st|first)\b/i.test(text)) occurrences.push(1);
  if (/\b(2nd|second)\b/i.test(text)) occurrences.push(2);
  if (/\b(3rd|third)\b/i.test(text)) occurrences.push(3);
  if (/\b(4th|fourth)\b/i.test(text)) occurrences.push(4);
  if (/\b(5th|fifth)\b/i.test(text)) occurrences.push(5);

  const isLastOfMonth = /\blast\b/i.test(text);

  return {
    hasNthQualifier: occurrences.length > 0 || isLastOfMonth,
    occurrences,
    isLastOfMonth,
  };
}

/**
 * Evaluates whether a night's monthly (nth-weekday) qualifier matches the given target date in America/New_York time.
 * Weekday-only rows (with no nth-weekday qualifier) return true.
 */
export function matchesMonthlyWeekdayQualifier(
  dayOfWeekText: string,
  targetDate: Date | string = new Date()
): boolean {
  const qualifier = parseMonthlyWeekdayQualifier(dayOfWeekText);
  if (!qualifier.hasNthQualifier) {
    return true;
  }
  const cal = getClevelandCalendarDate(targetDate);
  if (qualifier.occurrences.includes(cal.nthWeekdayOfMonth)) {
    return true;
  }
  if (qualifier.isLastOfMonth && cal.isLastWeekdayOfMonth) {
    return true;
  }
  return false;
}

const ISO_DOW_MAP: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

/**
 * Resolves a day selection ("Tonight", "Tomorrow", "YYYY-MM-DD", or a weekday name "Monday".."Sunday")
 * to its target calendar Date in the Mon–Sun week of referenceDate (in America/New_York time).
 */
export function resolveTargetDateForDaySelection(
  selectedDay: string,
  referenceDate: Date | string = new Date()
): Date {
  const baseDate = parseClevelandDateInput(referenceDate);
  const trimmed = (selectedDay || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseClevelandDateInput(trimmed);
  }
  const raw = trimmed.toLowerCase();
  const cal = getClevelandCalendarDate(baseDate);

  if (raw === "tonight" || raw === "") {
    return baseDate;
  }
  if (raw === "tomorrow") {
    return new Date(
      Date.UTC(cal.year, cal.month - 1, cal.dayOfMonth + 1, 17, 0, 0)
    );
  }
  const targetIsoDow = ISO_DOW_MAP[raw];
  if (targetIsoDow) {
    const currentIsoDow = ISO_DOW_MAP[cal.weekday.toLowerCase()] || 1;
    const deltaDays = targetIsoDow - currentIsoDow;
    return new Date(
      Date.UTC(cal.year, cal.month - 1, cal.dayOfMonth + deltaDays, 17, 0, 0)
    );
  }
  return baseDate;
}

export function matchesDayFilter(
  night: Pick<NightRecord, "dayOfWeek" | "formatType"> & {
    rawDayOfWeek?: string;
  },
  selectedDay?: string | null,
  referenceDate: Date | string = new Date()
): boolean {
  if (!selectedDay || selectedDay === "ALL" || selectedDay.trim() === "") {
    return true;
  }
  const day = night.dayOfWeek || night.rawDayOfWeek || "";
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

  const targetDate = resolveTargetDateForDaySelection(
    selectedDay,
    referenceDate
  );
  const targetCal = getClevelandCalendarDate(targetDate);
  const targetWeekdayLower = targetCal.weekday.toLowerCase();

  if (dayLower === "thursday-sunday") {
    return ["thursday", "friday", "saturday", "sunday"].includes(
      targetWeekdayLower
    );
  }

  if (!dayLower.startsWith(targetWeekdayLower)) {
    return false;
  }

  return matchesMonthlyWeekdayQualifier(day, targetDate);
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
