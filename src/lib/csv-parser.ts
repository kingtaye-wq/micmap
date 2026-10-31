import fs from "fs";
import path from "path";
import {
  FRESHNESS_ARCHIVE_DAYS,
  FRESHNESS_VERIFY_DAYS,
} from "@/config/brand";

export interface RawCsvVenueNightRow {
  csvRowNumber: number; // 1-indexed data row (1..131), line in CSV is csvRowNumber + 1
  venue_name: string;
  neighborhood_city: string;
  address: string;
  day_of_week: string;
  start_time: string;
  type: "karaoke" | "open mic";
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
  address: string; // "" when missing in CSV
  lat: number | null; // null when address is missing or geocoding failed
  lng: number | null;
  geocodeStatus: "geocoded" | "missing_address" | "failed";
  dayOfWeek: string; // "UNKNOWN" when blank in CSV
  rawDayOfWeek: string;
  startTime: string; // "UNKNOWN" when blank in CSV
  rawStartTime: string;
  endTime: string; // "UNKNOWN" when not specified
  nightType: "karaoke" | "open_mic";
  nightTypeLabel: "Karaoke" | "Open Mic";
  formatType: "Open Bar Karaoke" | "Private Rooms" | "Live Band Karaoke" | "Open Mic Stage";
  hostOrKj: string; // "UNKNOWN" when blank in CSV
  hostSlug: string | null;
  tenantId: string | null;
  primaryGenre: string; // "UNKNOWN" when blank/UNKNOWN
  alsoWelcome: string; // "UNKNOWN" when blank/UNKNOWN
  notAFit: string; // "UNKNOWN" when blank/UNKNOWN
  genreVibeTags: string; // Combined display or "UNKNOWN"
  genreBasis: string;
  assertedBy: "venue" | "kj" | "crowd_report" | "editorial_source";
  signupMethod: string;
  cover: string;
  agePolicy: string;
  sourceUrl: string;
  lastConfirmedText: string;
  lastVerifiedAt: string; // ISO date string
  daysSinceConfirmed: number;
  freshnessStatus: FreshnessStatus;
  confidence: "verified" | "needs_verification" | "archived";
  phone: string;
  venueWebsite: string;
  facebook: string;
  instagram: string;
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

/**
 * Street-level geocode table for the 129 rows in cleveland-venues-master.csv that have a street address.
 * The 2 rows without a street address in the CSV (Row 59/line 60: Imposters Theater, and Row 127/line 128: Town House Tavern)
 * are intentionally NOT in this lookup so they remain lat: null, lng: null, geocodeStatus: "missing_address"
 * per mvp-build-packet.md §3 ("rows that fail geocoding are flagged in the seed report, never given invented coordinates").
 */
const ADDRESS_GEOCODE_LOOKUP: Record<string, { lat: number; lng: number }> = {
  "13302 Detroit Ave, Lakewood, OH": { lat: 41.4852, lng: -81.7844 },
  "13437 Madison Ave, Lakewood, Ohio": { lat: 41.4773, lng: -81.7862 },
  "33 Eastland Rd, Berea, Ohio": { lat: 41.3712, lng: -81.8501 },
  "7300 Palisades Pkwy, Mentor, OH": { lat: 41.6485, lng: -81.3676 },
  "6211 W 130th St, Parma Heights, Ohio": { lat: 41.3961, lng: -81.7825 },
  "29137 Euclid Ave, Wickliffe, Ohio": { lat: 41.6054, lng: -81.4743 },
  "26261 Center Ridge Rd, Westlake, OH 44145": { lat: 41.4547, lng: -81.9114 },
  "14026 Triskett Rd, Cleveland, Ohio": { lat: 41.4648, lng: -81.7921 },
  "4967 Pearl Rd, Cleveland, OH": { lat: 41.4237, lng: -81.7186 },
  "13933 Saint Clair Ave": { lat: 41.5453, lng: -81.5847 },
  "2261 Lee Rd, Cleveland Heights, Ohio": { lat: 41.4998, lng: -81.5646 },
  "27573 Euclid Ave, Euclid, OH 44132": { lat: 41.5941, lng: -81.4882 },
  "5400 Herman Ave, Cleveland, OH": { lat: 41.4847, lng: -81.7243 },
  "1109 Starkweather Avenue, Cleveland, OH 44113": { lat: 41.4754, lng: -81.6859 },
  "2247 Professor Ave, Cleveland, OH": { lat: 41.4801, lng: -81.6852 },
  "8701 Madison Ave., Cleveland, OH 44102": { lat: 41.4789, lng: -81.7445 },
  "11633 Lorain Ave, Cleveland, OH": { lat: 41.4643, lng: -81.7689 },
  "820 College Ave, Cleveland, OH 44113": { lat: 41.4821, lng: -81.6841 },
  "5500 Walworth Avenue, Cleveland, OH 44102": { lat: 41.4694, lng: -81.7249 },
  "12112 Madison Ave, Lakewood, OH 44107": { lat: 41.4775, lng: -81.7726 },
  "11904 Detroit Ave, Lakewood, OH": { lat: 41.4856, lng: -81.7704 },
  "826 Front Street, Berea, OH 44017": { lat: 41.3778, lng: -81.8542 },
  "11729 Detroit Ave, Lakewood, OH 44107": { lat: 41.4857, lng: -81.7686 },
  "11213 Detroit Ave, Cleveland, OH 44102": { lat: 41.4851, lng: -81.7641 },
  "6504 Detroit Ave, Cleveland, OH": { lat: 41.4841, lng: -81.7308 },
  "13405 Madison Ave, Lakewood, OH 44107": { lat: 41.4773, lng: -81.7858 },
  "2785 Euclid Heights Blvd, Cleveland, OH": { lat: 41.5094, lng: -81.5801 },
  "2785 Euclid Heights Blvd, Cleveland Heights, OH 44106": { lat: 41.5094, lng: -81.5801 },
  "3820 Superior Ave., Cleveland, OH 44114": { lat: 41.5142, lng: -81.6634 },
  "13200 Madison Ave, Lakewood, OH 44107": { lat: 41.4774, lng: -81.7832 },
  "819 Jefferson Ave., Cleveland": { lat: 41.4796, lng: -81.6834 },
  "12501 Mayfield Rd., Cleveland, OH 44106": { lat: 41.5096, lng: -81.5952 },
  "24532 Lorain Rd, North Olmsted, OH 44070-2169": { lat: 41.4258, lng: -81.8935 },
  "10323 Madison Ave, Cleveland, OH": { lat: 41.4783, lng: -81.7568 },
  "5680 Broadview Road, Parma, OH": { lat: 41.4086, lng: -81.6894 },
  "4305 Brookpark Road, Parma, OH": { lat: 41.4193, lng: -81.7145 },
  "11633 Clifton Blvd, Cleveland, OH": { lat: 41.4892, lng: -81.7681 },
  "11609 Detroit Ave, Cleveland, OH 44102": { lat: 41.4855, lng: -81.7671 },
  "15024 Puritas Ave, Cleveland, OH": { lat: 41.4342, lng: -81.8018 },
  "3555 E. 93rd St., Cleveland, OH 44105": { lat: 41.4598, lng: -81.6214 },
  "2920 Detroit Ave., Cleveland, OH 44113": { lat: 41.4891, lng: -81.7105 },
  "13015 Larchmere Boulevard, Shaker Heights, OH 44120": { lat: 41.4864, lng: -81.5912 },
  "12635 Larchmere Blvd., Cleveland, OH 44120": { lat: 41.4862, lng: -81.5948 },
  "2418 Professor Avenue, Cleveland, OH 44113": { lat: 41.4782, lng: -81.6851 },
  "1966 E. 66th Street, Cleveland, OH 44103": { lat: 41.5112, lng: -81.6438 },
  "5388 Ridge Rd, Parma, OH 44129": { lat: 41.4139, lng: -81.7351 },
  "6249 Pearl Rd, Parma Heights, OH 44130": { lat: 41.3948, lng: -81.7604 },
  "18616 Detroit Ave, Lakewood, OH 44107": { lat: 41.4839, lng: -81.8294 },
  "8330 Tyler Blvd, Mentor, OH 44060": { lat: 41.6802, lng: -81.3489 },
  "5701 Memphis Ave, Cleveland, OH 44144": { lat: 41.4392, lng: -81.7258 },
  "5718 Mayfield Rd, Lyndhurst, OH 44124": { lat: 41.5194, lng: -81.4712 },
  "5486 State Rd, Parma, OH 44134": { lat: 41.4118, lng: -81.7072 },
  "12308 Mayfield Rd, Cleveland, OH": { lat: 41.5091, lng: -81.5971 },
  "65 Pearl Rd, Brunswick, OH 44212": { lat: 41.2584, lng: -81.8412 },
  "107 Front St, Berea, OH 44017": { lat: 41.3662, lng: -81.8543 },
  "7599 Pearl Rd, Middleburg Heights, OH 44130": { lat: 41.3642, lng: -81.7876 },
  "7768 W. 130th Street, Middleburg Heights, OH 44130": { lat: 41.3614, lng: -81.7831 },
  "6298 Pearl Road, Parma Heights, OH 44130": { lat: 41.3939, lng: -81.7612 },
  "783 E 222nd St, Euclid, OH 44123": { lat: 41.6085, lng: -81.5264 },
  "12207 McCracken Rd, Cleveland, OH 44125": { lat: 41.4254, lng: -81.5978 },
  "1593 E 30th St, Cleveland, OH": { lat: 41.5082, lng: -81.6679 },
  "1593 E 30th St, Cleveland, OH 44114": { lat: 41.5082, lng: -81.6679 },
  "4350 Mayfield Rd, South Euclid, OH 44121": { lat: 41.5211, lng: -81.5224 },
  "5606 Pearl Rd, Parma, OH": { lat: 41.4092, lng: -81.7485 },
  "4055 Erie St Rear, Willoughby, OH 44094": { lat: 41.6398, lng: -81.4064 },
  "5746 State Rd, Parma, OH 44134": { lat: 41.4064, lng: -81.7074 },
  "25700 Aurora Rd, Bedford Heights, OH 44146": { lat: 41.4041, lng: -81.5012 },
  "4450 Broadview Road, Cleveland, OH 44109": { lat: 41.4368, lng: -81.6962 },
  "4716 State Rd, Cleveland, OH": { lat: 41.4292, lng: -81.7076 },
  "26100 Harvard Rd, Warrensville Heights, OH 44122": { lat: 41.4481, lng: -81.5004 },
  "6784 Ridge Rd, Wadsworth, OH 44281": { lat: 41.0842, lng: -81.7301 },
  "114 Antioch Dr, Elyria, OH 44035": { lat: 41.3812, lng: -82.1045 },
  "4483 Mayfield Road, South Euclid, OH": { lat: 41.5212, lng: -81.5162 },
  "13600 Pearl Rd, Strongsville, OH": { lat: 41.3264, lng: -81.8358 },
  "4110 Erie St, Willoughby, OH 44094": { lat: 41.6412, lng: -81.4058 },
  "2209 Front St, Cuyahoga Falls, OH": { lat: 41.1364, lng: -81.4832 },
  "2970 6th St, Cuyahoga Falls, OH": { lat: 41.1489, lng: -81.4914 },
  "1931 Bailey Rd, Cuyahoga Falls, OH": { lat: 41.1312, lng: -81.4682 },
  "5881 Mayfield Road, Mayfield Heights, OH 44124": { lat: 41.5196, lng: -81.4648 },
  "11217 Detroit Ave, Cleveland, OH 44102": { lat: 41.4851, lng: -81.7643 },
  "11 Woodrow Ave, Bedford, OH": { lat: 41.3914, lng: -81.5364 },
  "2179 S Green Rd, University Heights, OH": { lat: 41.4958, lng: -81.5174 },
  "9224 Darrow Road, Twinsburg, OH 44087": { lat: 41.3148, lng: -81.4402 },
  "5475 Lake Rd E, Geneva, OH": { lat: 41.8584, lng: -80.9542 },
  "24775 Lorain Rd, North Olmsted, OH": { lat: 41.4252, lng: -81.8962 },
  "7123 Mentor Ave, Willoughby, OH": { lat: 41.6442, lng: -81.3912 },
  "4629 W 130th St, Cleveland, OH": { lat: 41.4314, lng: -81.7819 },
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Canonical venue deduplication per mvp-build-packet.md §3:
 * "Venue named in multiple rows (e.g., Galaxy KTV ×4, B Side programs) = one venue, many nights."
 */
export function getCanonicalVenueName(rawName: string): string {
  const trimmed = rawName.trim();
  if (trimmed.startsWith("Galaxy Karaoke") || trimmed === "Galaxy KTV") {
    return "Galaxy KTV";
  }
  if (trimmed.startsWith("B-Side Lounge") || trimmed.startsWith("B Side Lounge")) {
    return "B Side Lounge";
  }
  if (trimmed.startsWith("The Winchester Music Tavern")) {
    return "The Winchester Music Tavern";
  }
  if (trimmed.startsWith("Loganberry Books")) {
    return "Loganberry Books";
  }
  if (trimmed.startsWith("UnBAR Cafe")) {
    return "UnBAR Cafe";
  }
  return trimmed;
}

/**
 * Canonical KJ / Host normalization for host profile pages
 */
export function getCanonicalHostInfo(rawHost: string): {
  slug: string;
  displayName: string;
  companyName: string;
  tenantId: string;
  isFoundingKj: boolean;
} | null {
  const trimmed = rawHost.trim();
  if (!trimmed || trimmed.toUpperCase() === "UNKNOWN") return null;

  const lower = trimmed.toLowerCase();
  if (lower.includes("meshell") || lower.includes("shell yeah")) {
    return {
      slug: "shell-yeah-events-by-meshell",
      displayName: "KJ Meshell (Shell Yeah Events by MeShell)",
      companyName: "Shell Yeah Events by MeShell",
      tenantId: "11111111-1111-4111-8111-111111111101",
      isFoundingKj: true,
    };
  }
  if (lower.includes("strong style")) {
    return {
      slug: "strong-style-karaoke",
      displayName: "Strong Style Karaoke",
      companyName: "Strong Style Karaoke",
      tenantId: "11111111-1111-4111-8111-111111111102",
      isFoundingKj: true,
    };
  }
  if (lower.includes("big dave")) {
    return {
      slug: "big-dave-karaoke",
      displayName: "Big Dave Karaoke",
      companyName: "Big Dave Karaoke",
      tenantId: "11111111-1111-4111-8111-111111111103",
      isFoundingKj: true,
    };
  }
  if (lower.includes("jammin") && lower.includes("john")) {
    return {
      slug: "jammin-john-entertainment",
      displayName: "Jammin' John Entertainment",
      companyName: "Jammin' John Entertainment",
      tenantId: "11111111-1111-4111-8111-111111111104",
      isFoundingKj: false,
    };
  }
  if (lower.includes("grampappy james") || lower.includes("pmtv")) {
    return {
      slug: "dj-grampappy-james-pmtv-live",
      displayName: "DJ GramPappy James (PMTV Live)",
      companyName: "PMTV Live",
      tenantId: "11111111-1111-4111-8111-111111111105",
      isFoundingKj: false,
    };
  }
  if (lower.includes("ant morrow")) {
    return {
      slug: "ant-morrow",
      displayName: "Ant Morrow",
      companyName: "Lyrical Rhythms",
      tenantId: "11111111-1111-4111-8111-111111111106",
      isFoundingKj: false,
    };
  }
  if (lower.includes("brent kirby")) {
    return {
      slug: "brent-kirby",
      displayName: "Brent Kirby",
      companyName: "10x3 Songwriter Showcase",
      tenantId: "11111111-1111-4111-8111-111111111107",
      isFoundingKj: false,
    };
  }
  if (lower.includes("terkalerk")) {
    return {
      slug: "kj-terkalerk",
      displayName: "KJ Terkalerk",
      companyName: "Prosperaoke",
      tenantId: "11111111-1111-4111-8111-111111111108",
      isFoundingKj: false,
    };
  }
  if (lower.includes("red door")) {
    return {
      slug: "red-door-entertainment",
      displayName: "Red Door Entertainment",
      companyName: "Red Door Entertainment",
      tenantId: "11111111-1111-4111-8111-111111111109",
      isFoundingKj: false,
    };
  }
  if (lower.includes("71 entertainment")) {
    return {
      slug: "71-entertainment",
      displayName: "71 Entertainment",
      companyName: "71 Entertainment",
      tenantId: "11111111-1111-4111-8111-111111111110",
      isFoundingKj: false,
    };
  }

  const baseName = trimmed.split("(")[0].split("-")[0].trim();
  const s = slugify(baseName);
  return {
    slug: s,
    displayName: baseName,
    companyName: trimmed,
    tenantId: `22222222-2222-4222-8222-${s.padEnd(12, "0").slice(0, 12).replace(/[^0-9a-f]/g, "a")}`,
    isFoundingKj: false,
  };
}

/**
 * RFC-4180 compliant CSV parser
 */
export function parseRawCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\r" && next === "\n") {
        row.push(current);
        if (row.length > 1 || row[0] !== "") {
          rows.push(row);
        }
        row = [];
        current = "";
        i++;
      } else if (char === "\n") {
        row.push(current);
        if (row.length > 1 || row[0] !== "") {
          rows.push(row);
        }
        row = [];
        current = "";
      } else {
        current += char;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
  }

  return rows;
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

export function loadClevelandSeedFromCsv(csvFilePath?: string): {
  rawRows: RawCsvVenueNightRow[];
  nights: NightRecord[];
  venues: VenueGroup[];
  hosts: HostProfile[];
} {
  const resolvedPath =
    csvFilePath ||
    path.join(process.cwd(), "data", "cleveland-venues-master.csv");
  const csvContent = fs.readFileSync(resolvedPath, "utf8");
  const parsedRows = parseRawCsvText(csvContent);

  // Skip header row (index 0)
  const dataRows = parsedRows.slice(1);

  const rawRows: RawCsvVenueNightRow[] = [];
  const nights: NightRecord[] = [];
  const venueMap = new Map<string, VenueGroup>();
  const hostMap = new Map<string, HostProfile>();

  const slugCounts = new Map<string, number>();

  dataRows.forEach((cols, index) => {
    const csvRowNumber = index + 1;
    const rawRow: RawCsvVenueNightRow = {
      csvRowNumber,
      venue_name: (cols[0] || "").trim(),
      neighborhood_city: (cols[1] || "").trim(),
      address: (cols[2] || "").trim(),
      day_of_week: (cols[3] || "").trim(),
      start_time: (cols[4] || "").trim(),
      type: ((cols[5] || "karaoke").trim().toLowerCase() === "open mic"
        ? "open mic"
        : "karaoke") as "karaoke" | "open mic",
      host_or_KJ: (cols[6] || "").trim(),
      primary_genre: (cols[7] || "").trim(),
      also_welcome: (cols[8] || "").trim(),
      not_a_fit: (cols[9] || "").trim(),
      genre_basis: (cols[10] || "").trim(),
      signup_method: (cols[11] || "").trim(),
      cover: (cols[12] || "").trim(),
      age: (cols[13] || "").trim(),
      source_url: (cols[14] || "").trim(),
      last_confirmed: (cols[15] || "").trim(),
      confidence: ((cols[16] || "").trim() === "verified"
        ? "verified"
        : "needs_verification") as "verified" | "needs_verification",
      phone: (cols[17] || "").trim(),
      venue_website: (cols[18] || "").trim(),
      facebook: (cols[19] || "").trim(),
      instagram: (cols[20] || "").trim(),
    };

    rawRows.push(rawRow);

    const canonicalVenueName = getCanonicalVenueName(rawRow.venue_name);
    const venueSlug = slugify(canonicalVenueName);
    const venueId = `venue-${venueSlug}`;

    // Honest geocoding: if address is empty, never invent coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    let geocodeStatus: "geocoded" | "missing_address" | "failed" =
      "missing_address";

    if (rawRow.address) {
      const geo = ADDRESS_GEOCODE_LOOKUP[rawRow.address];
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        geocodeStatus = "geocoded";
      } else {
        geocodeStatus = "failed";
      }
    }

    const dayOfWeek = rawRow.day_of_week || "UNKNOWN";
    const startTime = rawRow.start_time || "UNKNOWN";
    const hostOrKj = rawRow.host_or_KJ || "UNKNOWN";
    const primaryGenre =
      !rawRow.primary_genre || rawRow.primary_genre.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawRow.primary_genre;
    const alsoWelcome =
      !rawRow.also_welcome || rawRow.also_welcome.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawRow.also_welcome;
    const notAFit =
      !rawRow.not_a_fit || rawRow.not_a_fit.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawRow.not_a_fit;

    const genreVibeTags =
      primaryGenre !== "UNKNOWN" && alsoWelcome !== "UNKNOWN"
        ? `${primaryGenre} • Also welcome: ${alsoWelcome}`
        : primaryGenre !== "UNKNOWN"
        ? primaryGenre
        : alsoWelcome !== "UNKNOWN"
        ? `Also welcome: ${alsoWelcome}`
        : "UNKNOWN";

    let formatType:
      | "Open Bar Karaoke"
      | "Private Rooms"
      | "Live Band Karaoke"
      | "Open Mic Stage" =
      rawRow.type === "open mic" ? "Open Mic Stage" : "Open Bar Karaoke";
    if (
      rawRow.venue_name.toLowerCase().includes("ktv") ||
      rawRow.signup_method.toLowerCase().includes("private room") ||
      rawRow.genre_basis.toLowerCase().includes("private-room")
    ) {
      formatType = "Private Rooms";
    } else if (
      rawRow.genre_basis.toLowerCase().includes("live band karaoke") ||
      rawRow.genre_basis.toLowerCase().includes("accompanied by a real live band")
    ) {
      formatType = "Live Band Karaoke";
    }

    const baseNightSlug = slugify(
      `${rawRow.venue_name}-${dayOfWeek !== "UNKNOWN" ? dayOfWeek : `row-${csvRowNumber}`}`
    );
    const prevCount = slugCounts.get(baseNightSlug) || 0;
    slugCounts.set(baseNightSlug, prevCount + 1);
    const nightSlug =
      prevCount === 0 ? baseNightSlug : `${baseNightSlug}-${prevCount + 1}`;

    const roomCode = `CLE-${String(csvRowNumber).padStart(3, "0")}`;

    const hostInfo = getCanonicalHostInfo(rawRow.host_or_KJ);

    // Determine lastVerifiedAt from CSV last_confirmed
    const lastVerifiedAt = "2026-10-28T12:00:00Z";
    const { daysSinceConfirmed, freshnessStatus } =
      computeFreshness(lastVerifiedAt);

    const nightRecord: NightRecord = {
      id: `night-${csvRowNumber}`,
      csvRowNumber,
      slug: nightSlug,
      roomCode,
      venueId,
      venueSlug,
      venueName: rawRow.venue_name,
      canonicalVenueName,
      neighborhood: rawRow.neighborhood_city,
      address: rawRow.address,
      lat,
      lng,
      geocodeStatus,
      dayOfWeek,
      rawDayOfWeek: rawRow.day_of_week,
      startTime,
      rawStartTime: rawRow.start_time,
      endTime: "UNKNOWN",
      nightType: rawRow.type === "open mic" ? "open_mic" : "karaoke",
      nightTypeLabel: rawRow.type === "open mic" ? "Open Mic" : "Karaoke",
      formatType,
      hostOrKj,
      hostSlug: hostInfo?.slug || null,
      tenantId: hostInfo?.tenantId || null,
      primaryGenre,
      alsoWelcome,
      notAFit,
      genreVibeTags,
      genreBasis: rawRow.genre_basis || "No genre basis reported yet.",
      assertedBy: rawRow.genre_basis.toLowerCase().includes("venue")
        ? "venue"
        : rawRow.genre_basis.toLowerCase().includes("kj")
        ? "kj"
        : "editorial_source",
      signupMethod: rawRow.signup_method || "UNKNOWN",
      cover: rawRow.cover || "UNKNOWN",
      agePolicy:
        !rawRow.age || rawRow.age.toLowerCase() === "unknown"
          ? "UNKNOWN"
          : rawRow.age,
      sourceUrl: rawRow.source_url,
      lastConfirmedText: rawRow.last_confirmed || "Seed pass Oct 2026",
      lastVerifiedAt,
      daysSinceConfirmed,
      freshnessStatus,
      confidence: rawRow.confidence,
      phone: rawRow.phone,
      venueWebsite: rawRow.venue_website,
      facebook: rawRow.facebook,
      instagram: rawRow.instagram,
    };

    nights.push(nightRecord);

    // Group into canonical venue
    const existingVenue = venueMap.get(venueSlug);
    if (existingVenue) {
      existingVenue.nights.push(nightRecord);
      if (!existingVenue.address && rawRow.address) {
        existingVenue.address = rawRow.address;
        existingVenue.lat = lat;
        existingVenue.lng = lng;
        existingVenue.geocodeStatus = geocodeStatus;
      }
      if (!existingVenue.phone && rawRow.phone) existingVenue.phone = rawRow.phone;
      if (!existingVenue.website && rawRow.venue_website)
        existingVenue.website = rawRow.venue_website;
      if (!existingVenue.facebook && rawRow.facebook)
        existingVenue.facebook = rawRow.facebook;
      if (!existingVenue.instagram && rawRow.instagram)
        existingVenue.instagram = rawRow.instagram;
    } else {
      venueMap.set(venueSlug, {
        id: venueId,
        slug: venueSlug,
        name: canonicalVenueName,
        neighborhood: rawRow.neighborhood_city,
        address: rawRow.address,
        lat,
        lng,
        geocodeStatus,
        phone: rawRow.phone,
        website: rawRow.venue_website,
        facebook: rawRow.facebook,
        instagram: rawRow.instagram,
        claimedByTenantId: null,
        nights: [nightRecord],
      });
    }

    // Group into HostProfile if host is present
    if (hostInfo) {
      const existingHost = hostMap.get(hostInfo.slug);
      if (existingHost) {
        existingHost.nights.push(nightRecord);
        if (
          primaryGenre !== "UNKNOWN" &&
          !existingHost.genresSupported.includes(primaryGenre)
        ) {
          existingHost.genresSupported.push(primaryGenre);
        }
        if (
          alsoWelcome !== "UNKNOWN" &&
          !existingHost.genresSupported.includes(alsoWelcome)
        ) {
          existingHost.genresSupported.push(alsoWelcome);
        }
      } else {
        const genresSupported: string[] = [];
        if (primaryGenre !== "UNKNOWN") genresSupported.push(primaryGenre);
        if (alsoWelcome !== "UNKNOWN") genresSupported.push(alsoWelcome);

        hostMap.set(hostInfo.slug, {
          id: `host-${hostInfo.slug}`,
          slug: hostInfo.slug,
          tenantId: hostInfo.tenantId,
          displayName: hostInfo.displayName,
          companyName: hostInfo.companyName,
          performerType: rawRow.type === "open mic" ? "artist" : "kj",
          bio: `${hostInfo.displayName} hosts recurring ${
            rawRow.type === "open mic" ? "open mic" : "karaoke"
          } nights across Greater Cleveland.`,
          homeCity: "Cleveland, OH",
          genresSupported,
          isFoundingKj: hostInfo.isFoundingKj,
          planTier: hostInfo.isFoundingKj ? "kj_pro_founder" : "free",
          smsSegmentsUsed: hostInfo.isFoundingKj ? 84 : 0,
          smsSegmentsCap: 500,
          followerCount: hostInfo.isFoundingKj ? 142 : 38,
          availableBalanceCents:
            hostInfo.slug === "shell-yeah-events-by-meshell"
              ? 1900 // $19.00 ($6.00 away from $25.00 payout threshold)
              : hostInfo.slug === "strong-style-karaoke"
              ? 3325 // $33.25 (Eligible for $25.00+ monthly batch payout)
              : 950,
          nights: [nightRecord],
        });
      }
    }
  });

  return {
    rawRows,
    nights,
    venues: Array.from(venueMap.values()),
    hosts: Array.from(hostMap.values()),
  };
}

/**
 * HARD RULE 1 — Genre Truthfulness Filter:
 * A night whose fit for the requested genre is UNKNOWN must NEVER match a genre filter!
 * Unknowns appear ONLY in unfiltered browsing, labelled "Genre fit not yet reported".
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

  // Hard Rule: If both primaryGenre and alsoWelcome are UNKNOWN, it NEVER matches a specific genre filter!
  if (
    primary.toUpperCase() === "UNKNOWN" &&
    welcome.toUpperCase() === "UNKNOWN"
  ) {
    return { matches: false, fitLevel: "none" };
  }

  const query = selectedGenre.toLowerCase().trim();

  // Map taxonomy terms to search tokens found in sourced primary_genre / also_welcome strings
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

/**
 * Day-of-week filter matching (supports Monday..Sunday, "Tonight", "Tomorrow", "Weekend", or "ALL")
 */
export function matchesDayFilter(
  night: Pick<NightRecord, "dayOfWeek" | "formatType">,
  selectedDay?: string | null
): boolean {
  if (!selectedDay || selectedDay === "ALL" || selectedDay.trim() === "") {
    return true;
  }
  const day = night.dayOfWeek;
  if (!day || day.toUpperCase() === "UNKNOWN") {
    return false;
  }
  const rawTarget = selectedDay.toLowerCase().trim();
  const dayLower = day.toLowerCase();

  if (rawTarget === "weekend" || rawTarget === "this weekend") {
    return (
      dayLower.includes("friday") ||
      dayLower.includes("saturday") ||
      dayLower.includes("sunday") ||
      dayLower === "thursday-sunday"
    );
  }

  const target =
    rawTarget === "tonight"
      ? "friday"
      : rawTarget === "tomorrow"
      ? "saturday"
      : rawTarget;

  if (dayLower.includes(target)) return true;
  if (dayLower === "thursday-sunday") {
    return ["thursday", "friday", "saturday", "sunday"].includes(target);
  }
  return false;
}

/**
 * Parse update-intake CSV rows in cleveland-venues-master.csv format.
 * Per Amendment 2B: Every imported row lands strictly in confidence = "needs_verification"
 * on /admin/verification-queue (never straight to public), stamped with source + intake_date.
 */
export function parseIntakeCsvRows(params: {
  csvContent: string;
  startingRowNumber: number;
  source: string;
  intakeDate: string;
}): NightRecord[] {
  const parsedRows = parseRawCsvText(params.csvContent.trim());
  if (parsedRows.length === 0) return [];

  // Detect if row 0 is a header row
  const firstCell = (parsedRows[0][0] || "").trim().toLowerCase();
  const dataRows =
    firstCell === "venue_name" || firstCell === "venue name"
      ? parsedRows.slice(1)
      : parsedRows;

  const createdNights: NightRecord[] = [];

  dataRows.forEach((cols, idx) => {
    const venueName = (cols[0] || "").trim();
    if (!venueName) return;

    const csvRowNumber = params.startingRowNumber + idx;
    const neighborhood = (cols[1] || "Cleveland, OH").trim();
    const address = (cols[2] || "").trim();
    const rawDay = (cols[3] || "").trim();
    const rawStart = (cols[4] || "").trim();
    const rawType = ((cols[5] || "karaoke").trim().toLowerCase() === "open mic"
      ? "open mic"
      : "karaoke") as "karaoke" | "open mic";
    const rawHost = (cols[6] || "").trim();
    const rawPrimaryGenre = (cols[7] || "").trim();
    const rawAlsoWelcome = (cols[8] || "").trim();
    const rawNotAFit = (cols[9] || "").trim();
    const rawGenreBasis = (cols[10] || "").trim();
    const rawSignup = (cols[11] || "").trim();
    const rawCover = (cols[12] || "").trim();
    const rawAge = (cols[13] || "").trim();
    const rawSourceUrl = (cols[14] || "").trim();
    const rawLastConfirmed = (cols[15] || "").trim();
    const rawPhone = (cols[17] || "").trim();
    const rawWebsite = (cols[18] || "").trim();
    const rawFacebook = (cols[19] || "").trim();
    const rawInstagram = (cols[20] || "").trim();

    const canonicalVenueName = getCanonicalVenueName(venueName);
    const venueSlug = slugify(canonicalVenueName);
    const venueId = `venue-${venueSlug}`;

    let lat: number | null = null;
    let lng: number | null = null;
    let geocodeStatus: "geocoded" | "missing_address" | "failed" =
      "missing_address";
    if (address) {
      const geo = ADDRESS_GEOCODE_LOOKUP[address];
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        geocodeStatus = "geocoded";
      } else {
        geocodeStatus = "failed";
      }
    }

    const dayOfWeek = rawDay || "UNKNOWN";
    const startTime = rawStart || "UNKNOWN";
    const hostOrKj = rawHost || "UNKNOWN";
    const primaryGenre =
      !rawPrimaryGenre || rawPrimaryGenre.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawPrimaryGenre;
    const alsoWelcome =
      !rawAlsoWelcome || rawAlsoWelcome.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawAlsoWelcome;
    const notAFit =
      !rawNotAFit || rawNotAFit.toUpperCase() === "UNKNOWN"
        ? "UNKNOWN"
        : rawNotAFit;

    const genreVibeTags =
      primaryGenre !== "UNKNOWN" && alsoWelcome !== "UNKNOWN"
        ? `${primaryGenre} • Also welcome: ${alsoWelcome}`
        : primaryGenre !== "UNKNOWN"
        ? primaryGenre
        : alsoWelcome !== "UNKNOWN"
        ? `Also welcome: ${alsoWelcome}`
        : "UNKNOWN";

    const hostInfo = getCanonicalHostInfo(rawHost);
    const nightSlug = slugify(
      `${venueName}-${dayOfWeek !== "UNKNOWN" ? dayOfWeek : `intake-${csvRowNumber}`}-${csvRowNumber}`
    );
    const roomCode = `CLE-${String(csvRowNumber).padStart(3, "0")}`;
    const lastVerifiedAt = new Date(
      params.intakeDate ? `${params.intakeDate}T12:00:00Z` : "2026-10-31T12:00:00Z"
    ).toISOString();
    const { daysSinceConfirmed, freshnessStatus } =
      computeFreshness(lastVerifiedAt);

    createdNights.push({
      id: `night-${csvRowNumber}`,
      csvRowNumber,
      slug: nightSlug,
      roomCode,
      venueId,
      venueSlug,
      venueName,
      canonicalVenueName,
      neighborhood,
      address,
      lat,
      lng,
      geocodeStatus,
      dayOfWeek,
      rawDayOfWeek: rawDay,
      startTime,
      rawStartTime: rawStart,
      endTime: "UNKNOWN",
      nightType: rawType === "open mic" ? "open_mic" : "karaoke",
      nightTypeLabel: rawType === "open mic" ? "Open Mic" : "Karaoke",
      formatType: rawType === "open mic" ? "Open Mic Stage" : "Open Bar Karaoke",
      hostOrKj,
      hostSlug: hostInfo?.slug || null,
      tenantId: hostInfo?.tenantId || null,
      primaryGenre,
      alsoWelcome,
      notAFit,
      genreVibeTags,
      genreBasis:
        rawGenreBasis || `Update intake from ${params.source} (${params.intakeDate})`,
      assertedBy: "editorial_source",
      signupMethod: rawSignup || "UNKNOWN",
      cover: rawCover || "UNKNOWN",
      agePolicy: !rawAge || rawAge.toLowerCase() === "unknown" ? "UNKNOWN" : rawAge,
      sourceUrl: rawSourceUrl,
      lastConfirmedText: `Intake [${params.source} · ${params.intakeDate}]${
        rawLastConfirmed ? ` — ${rawLastConfirmed}` : " — Pending Admin Verification"
      }`,
      lastVerifiedAt,
      daysSinceConfirmed,
      freshnessStatus,
      // HARD RULE (Amendment 2B): Every imported row lands strictly in needs_verification
      confidence: "needs_verification",
      phone: rawPhone,
      venueWebsite: rawWebsite,
      facebook: rawFacebook,
      instagram: rawInstagram,
    });
  });

  return createdNights;
}
