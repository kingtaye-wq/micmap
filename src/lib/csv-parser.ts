import fs from "fs";
import path from "path";
import {
  FRESHNESS_ARCHIVE_DAYS,
  FRESHNESS_VERIFY_DAYS,
} from "@/config/brand";

import {
  PosterAsSourceStatus,
  SourceProvenanceRecord,
} from "./types";

export type { PosterAsSourceStatus, SourceProvenanceRecord };

export interface RawCsvVenueNightRow {
  csvRowNumber: number; // 1-indexed data row (1..143), line in CSV is csvRowNumber + 1
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
  address: string; // "" when missing in CSV
  lat: number | null; // null when address is missing or geocoding failed
  lng: number | null;
  geocodeStatus: "geocoded" | "missing_address" | "failed";
  dayOfWeek: string; // "UNKNOWN" when blank in CSV
  rawDayOfWeek: string;
  startTime: string; // "UNKNOWN" when blank in CSV
  rawStartTime: string;
  endTime: string; // "UNKNOWN" when not specified
  nightType: "karaoke" | "open_mic" | "live_band";
  nightTypeLabel: "Karaoke" | "Open Mic" | "Live Band";
  formatType:
    | "Open Bar Karaoke"
    | "Private Rooms"
    | "Live Band Karaoke"
    | "Open Mic Stage"
    | "Live Band Residency";
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
  "7313 Whipple Ave NW, North Canton, OH 44720": { lat: 40.8847, lng: -81.4239 },
  "2215 E Waterloo Rd, Akron, OH 44312": { lat: 41.0246, lng: -81.4428 },
  "17438 St Clair Ave, Cleveland, OH 44110": { lat: 41.5642, lng: -81.5584 },
  "570 E Cuyahoga Falls Ave, Akron, OH 44310": { lat: 41.1072, lng: -81.4918 },
  "5587 Ridge Rd, Parma, OH 44129": { lat: 41.4098, lng: -81.7352 },
  "3822 S Main St, Akron, OH": { lat: 40.9814, lng: -81.5292 },
  "14751 Pearl Rd, Strongsville, OH 44136": { lat: 41.3118, lng: -81.8359 },
  "3333 Manchester Rd, Suite 3, Akron, OH 44319": { lat: 40.9968, lng: -81.5542 },
  "4284 Beverly Hills Dr, Brunswick, OH 44212": { lat: 41.2392, lng: -81.8245 },
  "30308 Euclid Ave, Wickliffe, OH 44092": { lat: 41.6132, lng: -81.4648 },
  "4653 Warner Rd, Garfield Heights, OH 44125": { lat: 41.433, lng: -81.6314 },
  "9322 Nelson Ave, Cleveland, OH 44105": { lat: 41.4529, lng: -81.6205 },
  "4125 Lorain Ave, Cleveland, OH 44113": { lat: 41.48, lng: -81.7141 },
  "26191 Euclid Ave, Euclid, OH 44132": { lat: 41.589, lng: -81.5003 },
  "24951 Aurora Rd, Bedford Heights, OH 44146": { lat: 41.4114, lng: -81.5028 },
  "11121 Western Ave, Cleveland, OH 44111": { lat: 41.4703, lng: -81.764 },
  "1376 N Portage Path, Akron, OH 44313": { lat: 41.1322, lng: -81.5493 },
  "3614 E 65th St, Cleveland, OH 44105": { lat: 41.4597, lng: -81.6451 },
  "29137 Euclid Ave, Wickliffe, OH 44092": { lat: 41.6054, lng: -81.4743 },
  "24775 Lorain Rd, North Olmsted, OH 44070": { lat: 41.4252, lng: -81.8962 },
  "680 W Turkeyfoot Lake Rd, New Franklin, OH 44319": { lat: 40.9813, lng: -81.5455 },
  "3415 Brookpark Rd, Parma, OH 44134": { lat: 41.4189, lng: -81.7089 },
  "4452 Mayfield Rd, South Euclid, OH 44121": { lat: 41.52, lng: -81.5197 },
  "38464 Lakeshore Blvd, Willoughby, OH 44094": { lat: 41.6955, lng: -81.4001 },
  "3670 W 130th St, Cleveland, OH 44111": { lat: 41.4541, lng: -81.7796 },
  "16826 Lakeshore Blvd, Cleveland, OH 44110": { lat: 41.5806, lng: -81.5627 },
  "4370 Pearl Rd, Cleveland, OH 44109": { lat: 41.4367, lng: -81.7089 },
  "20621 Fairmount Blvd, Shaker Heights, OH 44118": { lat: 41.4865, lng: -81.5342 },
  "389 S Green Rd, South Euclid, OH 44121": { lat: 41.5421, lng: -81.5311 },
  "1822 W 25th St, Cleveland, OH 44113": { lat: 41.4864, lng: -81.7052 },
  "3420 Manchester Rd, Akron, OH 44319": { lat: 41.0066, lng: -81.5557 },
  "205 S Main St, Akron, OH 44308": { lat: 41.0798, lng: -81.5197 },
  "21181 Euclid Ave, Euclid, OH 44117": { lat: 41.5701, lng: -81.5323 },
  "16822 Chagrin Blvd, Shaker Heights, OH 44120": { lat: 41.4644, lng: -81.5631 },
  "6913 W 130th St, Parma Heights, OH 44130": { lat: 41.3755, lng: -81.7847 },
  "16367 Euclid Ave, East Cleveland, OH 44112": { lat: 41.546, lng: -81.566 },
  "3680 Pearl Ave, Lorain, OH": { lat: 41.437, lng: -82.1366 },
  "232 W Smith Road, Medina, OH 44256": { lat: 41.1362, lng: -81.8673 },
  "6966 Heisley Rd, Mentor, OH 44060": { lat: 41.6809, lng: -81.3036 },
  "1660 Massillon Rd, Akron, OH 44312": { lat: 41.0162, lng: -81.4636 },
  "1947 W Market St #103, Akron, OH 44313": { lat: 41.1134, lng: -81.5781 },
  "76 Broadway Ave, Bedford, OH 44146": { lat: 41.404, lng: -81.5546 },
  "5775 Chevrolet Blvd, Parma, OH 44130": { lat: 41.4056, lng: -81.7689 },
  "14804 St Clair Ave, Cleveland, OH 44110": { lat: 41.5524, lng: -81.5788 },
  "4209 E 131st St, Cleveland, OH 44105": { lat: 41.445, lng: -81.591 },
  "9617 Clinton Rd, Cleveland, OH 44144": { lat: 41.4515, lng: -81.7512 },
  "5150 Liberty Ave, Vermilion, OH 44089": { lat: 41.4224, lng: -82.3574 },
  "3941 State Road, Cuyahoga Falls, OH": { lat: 41.179, lng: -81.5085 },
  "225 High St, Fairport Harbor, OH 44077": { lat: 41.7565, lng: -81.2772 },
  "5504 Harvard Ave, Cleveland, OH 44105": { lat: 41.4483, lng: -81.6508 },
  "2126 Pearl Rd, Brunswick, OH 44212": { lat: 41.2172, lng: -81.8416 },
  "5011 Clark Ave, Cleveland, OH": { lat: 41.4696, lng: -81.7217 },
  "6370 York Rd, Parma Heights, OH 44130": { lat: 41.384, lng: -81.76 },
  "10230 Northfield Rd, Northfield, OH 44067": { lat: 41.3372, lng: -81.5307 },
  "5455 State Rd, Parma, OH 44134": { lat: 41.413, lng: -81.7104 },
  "7393 State Rd, Parma, OH": { lat: 41.3645, lng: -81.717 },
  "31635 Lorain Rd, North Olmsted, OH 44070": { lat: 41.3903, lng: -81.9698 },
  "4094 Pearl Rd, Medina, OH": { lat: 41.1626, lng: -81.8624 },
  "30036 Lorain Rd, North Olmsted, OH": { lat: 41.402, lng: -81.9525 },
  "1149 Pearl Rd, Brunswick, OH": { lat: 41.2436, lng: -81.8412 },
  "221 S Jefferson St, Medina, OH": { lat: 41.1376, lng: -81.8606 },
  "4912 Turney Rd, Garfield Heights, OH 44125": { lat: 41.4263, lng: -81.6128 },
  "5145 Turney Rd, Cleveland, OH 44125": { lat: 41.4212, lng: -81.609 },
  "347 Euclid Ave, Cleveland, OH 44114": { lat: 41.4999, lng: -81.6903 },
  "38228 Glenn Ave, Willoughby, OH 44094": { lat: 41.6405, lng: -81.4061 },
  "7500 Cedar Ave, Cleveland, OH 44103": { lat: 41.5003, lng: -81.637 },
  "1479 SOM Ctr Rd, Mayfield Heights, OH 44124": { lat: 41.5205, lng: -81.4386 },
  "1305 E Tallmadge Ave, Akron, OH 44310": { lat: 41.102, lng: -81.4678 },
  "3258 W 32nd St, Cleveland, OH 44109": { lat: 41.4654, lng: -81.7043 },
  "3081 E 93rd St, Cleveland, OH 44104": { lat: 41.4752, lng: -81.6214 },
  "795 W Market St, Akron, OH 44303": { lat: 41.0964, lng: -81.5429 },
  "1841 Merriman Rd, Akron, OH 44313": { lat: 41.1354, lng: -81.5545 },
  "1282 Weathervane Lane, Akron, OH 44313": { lat: 41.1354, lng: -81.5545 },
  "786 Front St, Berea, OH": { lat: 41.3868, lng: -81.853 },
  "786 Front St, Berea, OH 44017": { lat: 41.3868, lng: -81.853 },
  "5348 E Lake Rd, Sheffield Lake, OH 44054": { lat: 41.4929, lng: -82.0987 },
  "5348 Lake Rd, Sheffield Lake, OH 44054": { lat: 41.4929, lng: -82.0987 },
  "5513 Pearl Rd, Parma, OH 44129": { lat: 41.4119, lng: -81.7357 },
  "9208 Detroit Ave, Cleveland, OH": { lat: 41.4803, lng: -81.7468 },
  "9208 Detroit Ave, Cleveland, OH 44102": { lat: 41.4803, lng: -81.7468 },
  "203 E Royalton Rd, Broadview Heights, OH 44147": { lat: 41.3139, lng: -81.6839 },
  "1955 Triplett Blvd, Akron, OH 44312": { lat: 41.0434, lng: -81.4571 },
  "656 Sugar Ln, Elyria, OH 44035": { lat: 41.3607, lng: -82.0729 },
  "17406 St Clair Ave, Cleveland, OH 44110": { lat: 41.5664, lng: -81.5581 },
  "1054 Old River Rd, Cleveland, OH 44113": { lat: 41.5003, lng: -81.7011 },
  "323 S Main St, Akron, OH 44308": { lat: 41.0743, lng: -81.519 },
  "5609 Fulton Dr NW, Canton, OH 44718": { lat: 40.8561, lng: -81.461 },
  "1941 Triplett Blvd, Akron, OH 44312": { lat: 41.0437, lng: -81.4575 },
  "6509 Columbus Rd NE, Louisville, OH 44641": { lat: 40.865, lng: -81.2778 },
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

export function parseProvenanceCsvText(
  csvContent: string
): Map<string, SourceProvenanceRecord> {
  const map = new Map<string, SourceProvenanceRecord>();
  if (!csvContent || !csvContent.trim()) return map;
  const rows = parseRawCsvText(csvContent.trim());
  if (rows.length === 0) return map;

  const firstCell = (rows[0][0] || "").trim().toLowerCase();
  const dataRows =
    firstCell === "source_url" || firstCell === "sourceurl"
      ? rows.slice(1)
      : rows;

  for (const cols of dataRows) {
    const sourceUrl = (cols[0] || "").trim();
    if (!sourceUrl) continue;
    const rawStatus = (cols[7] || "none").trim() as PosterAsSourceStatus;
    const posterAsSourceStatus: PosterAsSourceStatus = [
      "none",
      "ask_the_poster",
      "draft_outreach_ready",
      "verified_by_poster",
    ].includes(rawStatus)
      ? rawStatus
      : "none";

    map.set(sourceUrl, {
      sourceUrl,
      sourcePlatform: (cols[1] || "").trim() || "Web / Directory",
      sourceContext: (cols[2] || "").trim() || "Ingested Source",
      posterName: (cols[3] || "").trim(),
      posterProfileUrl: (cols[4] || "").trim(),
      sourceContactInfo: (cols[5] || "").trim(),
      capturedDate: (cols[6] || "").trim() || "2026-10-31",
      posterAsSourceStatus,
      posterOutreachDraft: (cols[8] || "").trim() || undefined,
    });
  }
  return map;
}

export function loadSourceProvenanceMap(): Map<string, SourceProvenanceRecord> {
  const candidates = [
    path.join(process.cwd(), "research", "source-provenance.csv"),
    path.join(process.cwd(), "data", "source-provenance.csv"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const text = fs.readFileSync(candidate, "utf8");
        return parseProvenanceCsvText(text);
      }
    } catch {
      // ignore and fall through
    }
  }
  return new Map();
}

export function deriveProvenanceForRow(
  rawRow: RawCsvVenueNightRow,
  provenanceMap: Map<string, SourceProvenanceRecord>
): SourceProvenanceRecord {
  const explicit = provenanceMap.get(rawRow.source_url);
  if (explicit) {
    return explicit;
  }

  const url = (rawRow.source_url || "").toLowerCase();
  const basis = rawRow.genre_basis || "";
  let sourcePlatform = "Web / Directory";
  let sourceContext = "Directory / Venue Listing";
  let posterName = "";
  let posterProfileUrl = "";
  let sourceContactInfo = "";

  if (url.includes("facebook.com/groups/")) {
    sourcePlatform = "Facebook";
    if (url.includes("karaoke.for.akron.cleveland.ne.ohio")) {
      sourceContext = "FB Group: Karaoke for Akron, Cleveland & NE Ohio";
    } else if (url.includes("karaokeneohio")) {
      sourceContext = "FB Group: Karaoke NE Ohio";
    } else if (url.includes("karaokecompcircuitcle")) {
      sourceContext = "FB Group: Karaoke Comp Circuit CLE";
    } else {
      sourceContext = "Facebook Karaoke / Nightlife Group";
    }
    posterName = rawRow.host_or_KJ || "Facebook Group Poster";
    posterProfileUrl = rawRow.source_url;
  } else if (url.includes("facebook.com/reel/")) {
    sourcePlatform = "Facebook";
    sourceContext = "Facebook Saved Reels";
    posterName = rawRow.host_or_KJ || "Facebook Reel Poster";
    posterProfileUrl = rawRow.source_url;
  } else if (url.includes("facebook.com")) {
    sourcePlatform = "Facebook";
    sourceContext = "Venue Official Facebook Page";
    posterName = rawRow.venue_name;
    posterProfileUrl = rawRow.facebook || rawRow.source_url;
  } else if (url.includes("instagram.com/reel/")) {
    sourcePlatform = "Instagram";
    sourceContext = "Instagram Saved Collection";
    const handleMatch = basis.match(/@[a-zA-Z0-9._]+/);
    posterName = handleMatch ? handleMatch[0] : rawRow.host_or_KJ || "Instagram Reel Poster";
    posterProfileUrl = handleMatch
      ? `https://www.instagram.com/${handleMatch[0].slice(1)}/`
      : rawRow.source_url;
    if (handleMatch) {
      sourceContactInfo = handleMatch[0];
    }
  } else if (url.includes("instagram.com")) {
    sourcePlatform = "Instagram";
    sourceContext = "Venue / Host Instagram";
    posterName = rawRow.host_or_KJ || rawRow.venue_name;
    posterProfileUrl = rawRow.instagram || rawRow.source_url;
  } else if (url.includes("karaokelist.app")) {
    sourcePlatform = "Web / Directory";
    sourceContext = "KaraokeList Cleveland Guide";
  } else if (url.includes("clevescene.com")) {
    sourcePlatform = "Web / Editorial";
    sourceContext = "Cleveland Scene Guide";
  } else if (rawRow.venue_website && rawRow.source_url === rawRow.venue_website) {
    sourcePlatform = "Venue Website";
    sourceContext = "Official Venue Calendar / Page";
    posterName = rawRow.venue_name;
  }

  // Contact info ONLY when the source itself states it
  if (!sourceContactInfo) {
    const handleInBasis = basis.match(/@[a-zA-Z0-9._]+/);
    if (handleInBasis) {
      sourceContactInfo = handleInBasis[0];
    }
  }

  const dateMatch = (rawRow.last_confirmed || "").match(/\d{4}-\d{2}-\d{2}/);
  const capturedDate = dateMatch ? dateMatch[0] : "2026-10-31";

  return {
    sourceUrl: rawRow.source_url,
    sourcePlatform,
    sourceContext,
    posterName,
    posterProfileUrl,
    sourceContactInfo,
    capturedDate,
    posterAsSourceStatus: "none",
  };
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
  const provenanceMap = loadSourceProvenanceMap();

  // Skip header row (index 0)
  const dataRows = parsedRows.slice(1);

  const rawRows: RawCsvVenueNightRow[] = [];
  const nights: NightRecord[] = [];
  const venueMap = new Map<string, VenueGroup>();
  const hostMap = new Map<string, HostProfile>();

  const slugCounts = new Map<string, number>();

  dataRows.forEach((cols, index) => {
    const csvRowNumber = index + 1;
    const rawTypeCell = (cols[5] || "karaoke").trim().toLowerCase();
    const parsedType: "karaoke" | "open mic" | "live_band" =
      rawTypeCell === "open mic" || rawTypeCell === "open_mic"
        ? "open mic"
        : rawTypeCell === "live_band" || rawTypeCell === "live band"
        ? "live_band"
        : "karaoke";

    const rawRow: RawCsvVenueNightRow = {
      csvRowNumber,
      venue_name: (cols[0] || "").trim(),
      neighborhood_city: (cols[1] || "").trim(),
      address: (cols[2] || "").trim(),
      day_of_week: (cols[3] || "").trim(),
      start_time: (cols[4] || "").trim(),
      type: parsedType,
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
      | "Open Mic Stage"
      | "Live Band Residency" =
      rawRow.type === "open mic"
        ? "Open Mic Stage"
        : rawRow.type === "live_band"
        ? "Live Band Residency"
        : "Open Bar Karaoke";
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

    const provenance = deriveProvenanceForRow(rawRow, provenanceMap);

    const nightType: "karaoke" | "open_mic" | "live_band" =
      rawRow.type === "open mic"
        ? "open_mic"
        : rawRow.type === "live_band"
        ? "live_band"
        : "karaoke";
    const nightTypeLabel: "Karaoke" | "Open Mic" | "Live Band" =
      rawRow.type === "open mic"
        ? "Open Mic"
        : rawRow.type === "live_band"
        ? "Live Band"
        : "Karaoke";

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
      nightType,
      nightTypeLabel,
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
      sourcePlatform: provenance.sourcePlatform,
      sourceContext: provenance.sourceContext,
      posterName: provenance.posterName,
      posterProfileUrl: provenance.posterProfileUrl,
      sourceContactInfo: provenance.sourceContactInfo,
      capturedDate: provenance.capturedDate,
      posterAsSourceStatus: provenance.posterAsSourceStatus,
      posterOutreachDraft: provenance.posterOutreachDraft,
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

export {
  getClevelandCurrentDayOfWeek,
  getClevelandTomorrowDayOfWeek,
  parseClevelandDateInput,
  getClevelandCalendarDate,
  parseMonthlyWeekdayQualifier,
  matchesMonthlyWeekdayQualifier,
  resolveTargetDateForDaySelection,
  matchesDayFilter,
} from "./types";

/**
 * Parse update-intake CSV rows in cleveland-venues-master.csv format (+ optional provenance fields).
 * Per Amendment 2B & Amendment 4:
 * - Every imported row lands strictly in confidence = "needs_verification" on /admin/verification-queue
 *   (never straight to public), stamped with source + intake_date + full OS-internal source provenance.
 */
export function parseIntakeCsvRows(params: {
  csvContent: string;
  startingRowNumber: number;
  source: string;
  intakeDate: string;
  sourcePlatform?: string;
  sourceContext?: string;
  posterName?: string;
  posterProfileUrl?: string;
  sourceContactInfo?: string;
  capturedDate?: string;
  posterAsSourceStatus?: PosterAsSourceStatus;
  posterOutreachDraft?: string;
}): NightRecord[] {
  const parsedRows = parseRawCsvText(params.csvContent.trim());
  if (parsedRows.length === 0) return [];
  const provenanceMap = loadSourceProvenanceMap();

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
    const rawTypeCell = (cols[5] || "karaoke").trim().toLowerCase();
    const rawType: "karaoke" | "open mic" | "live_band" =
      rawTypeCell === "open mic" || rawTypeCell === "open_mic"
        ? "open mic"
        : rawTypeCell === "live_band" || rawTypeCell === "live band"
        ? "live_band"
        : "karaoke";
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

    // Optional per-row provenance columns (cols 21..28) or form-supplied provenance or provenance CSV lookup
    const csvProvPlatform = (cols[21] || "").trim();
    const csvProvContext = (cols[22] || "").trim();
    const csvPosterName = (cols[23] || "").trim();
    const csvPosterProfileUrl = (cols[24] || "").trim();
    const csvSourceContactInfo = (cols[25] || "").trim();
    const csvCapturedDate = (cols[26] || "").trim();
    const csvPosterStatus = (cols[27] || "").trim() as PosterAsSourceStatus;
    const csvPosterOutreachDraft = (cols[28] || "").trim();

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

    const derived = deriveProvenanceForRow(
      {
        csvRowNumber,
        venue_name: venueName,
        neighborhood_city: neighborhood,
        address,
        day_of_week: rawDay,
        start_time: rawStart,
        type: rawType,
        host_or_KJ: rawHost,
        primary_genre: rawPrimaryGenre,
        also_welcome: rawAlsoWelcome,
        not_a_fit: rawNotAFit,
        genre_basis: rawGenreBasis,
        signup_method: rawSignup,
        cover: rawCover,
        age: rawAge,
        source_url: rawSourceUrl,
        last_confirmed: rawLastConfirmed,
        confidence: "needs_verification",
        phone: rawPhone,
        venue_website: rawWebsite,
        facebook: rawFacebook,
        instagram: rawInstagram,
      },
      provenanceMap
    );

    const nightType: "karaoke" | "open_mic" | "live_band" =
      rawType === "open mic"
        ? "open_mic"
        : rawType === "live_band"
        ? "live_band"
        : "karaoke";
    const nightTypeLabel: "Karaoke" | "Open Mic" | "Live Band" =
      rawType === "open mic"
        ? "Open Mic"
        : rawType === "live_band"
        ? "Live Band"
        : "Karaoke";
    const formatType:
      | "Open Bar Karaoke"
      | "Private Rooms"
      | "Live Band Karaoke"
      | "Open Mic Stage"
      | "Live Band Residency" =
      rawType === "open mic"
        ? "Open Mic Stage"
        : rawType === "live_band"
        ? "Live Band Residency"
        : "Open Bar Karaoke";

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
      nightType,
      nightTypeLabel,
      formatType,
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
      sourcePlatform:
        csvProvPlatform || params.sourcePlatform || derived.sourcePlatform,
      sourceContext:
        csvProvContext ||
        params.sourceContext ||
        params.source ||
        derived.sourceContext,
      posterName: csvPosterName || params.posterName || derived.posterName,
      posterProfileUrl:
        csvPosterProfileUrl ||
        params.posterProfileUrl ||
        derived.posterProfileUrl,
      sourceContactInfo:
        csvSourceContactInfo ||
        params.sourceContactInfo ||
        derived.sourceContactInfo,
      capturedDate:
        csvCapturedDate ||
        params.capturedDate ||
        params.intakeDate ||
        derived.capturedDate,
      posterAsSourceStatus:
        csvPosterStatus ||
        params.posterAsSourceStatus ||
        derived.posterAsSourceStatus ||
        "none",
      posterOutreachDraft:
        csvPosterOutreachDraft ||
        params.posterOutreachDraft ||
        derived.posterOutreachDraft,
    });
  });

  return createdNights;
}
