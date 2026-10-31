"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  NightRecord,
  matchesDayFilter,
  matchesGenreFilter,
} from "@/lib/types";
import {
  APP_NAME,
  DEFAULT_CITY,
  DEFAULT_METRO,
  GENRE_TAXONOMY,
} from "@/config/brand";
import {
  CorrectionModal,
  ClaimModal,
} from "@/components/CorrectionAndClaimModals";
import {
  MapPin,
  Search,
  Mic,
  Music,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Radio,
  Sparkles,
  Filter,
  HelpCircle,
} from "lucide-react";

interface DiscoveryViewProps {
  initialNights: NightRecord[];
  defaultDay?: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

const DAY_CHIPS = [
  { label: "All Verified (73)", value: "ALL" },
  { label: "Tonight (Friday)", value: "Friday" },
  { label: "Monday", value: "Monday" },
  { label: "Tuesday", value: "Tuesday" },
  { label: "Wednesday", value: "Wednesday" },
  { label: "Thursday", value: "Thursday" },
  { label: "Saturday", value: "Saturday" },
  { label: "Sunday", value: "Sunday" },
];

const NEIGHBORHOOD_OPTIONS = [
  "ALL",
  "Lakewood",
  "Tremont",
  "Detroit-Shoreway",
  "Coventry",
  "Ohio City",
  "AsiaTown",
  "Berea",
  "Parma",
  "Parma Heights",
  "Mentor",
  "Westlake",
  "Euclid",
  "Cudell",
  "Little Italy",
  "Edgewater",
  "South Euclid",
  "Middleburg Heights",
];

export function DiscoveryView({
  initialNights,
  defaultDay = "ALL",
  pageTitle = "Find your crowd tonight",
  pageSubtitle = `Discover live karaoke and open mic nights across ${DEFAULT_METRO} — filter by day, type, or verified genre-fit.`,
}: DiscoveryViewProps) {
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [selectedType, setSelectedType] = useState<
    "ALL" | "karaoke" | "open_mic"
  >("ALL");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeNightId, setActiveNightId] = useState<string | null>(
    initialNights[0]?.id || null
  );

  // Modals state
  const [correctionTarget, setCorrectionTarget] = useState<{
    nightId: string;
    venueName: string;
    defaultField?:
      | "primaryGenre"
      | "alsoWelcome"
      | "notAFit"
      | "startTime"
      | "dayOfWeek"
      | "hostOrKj"
      | "signupMethod";
  } | null>(null);

  const [claimTarget, setClaimTarget] = useState<{
    targetType: "venue" | "night" | "person";
    targetId: string;
    targetName: string;
  } | null>(null);

  const filteredNights = useMemo(() => {
    return initialNights.filter((night) => {
      // Public safety check: never show needs_verification or >=90d expired
      if (
        night.confidence !== "verified" ||
        night.freshnessStatus === "expired_90d"
      ) {
        return false;
      }

      if (selectedDay !== "ALL" && !matchesDayFilter(night, selectedDay)) {
        return false;
      }

      if (selectedType !== "ALL" && night.nightType !== selectedType) {
        return false;
      }

      if (selectedFormat !== "ALL" && night.formatType !== selectedFormat) {
        return false;
      }

      if (
        selectedNeighborhood !== "ALL" &&
        !night.neighborhood
          .toLowerCase()
          .includes(selectedNeighborhood.toLowerCase())
      ) {
        return false;
      }

      // Hard Rule 1: Genre Truthfulness — UNKNOWN never matches a specific genre filter
      if (selectedGenre !== "ALL") {
        const fit = matchesGenreFilter(night, selectedGenre);
        if (!fit.matches) return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${night.venueName} ${night.neighborhood} ${night.hostOrKj} ${night.primaryGenre} ${night.alsoWelcome} ${night.dayOfWeek}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    initialNights,
    selectedDay,
    selectedType,
    selectedGenre,
    selectedNeighborhood,
    selectedFormat,
    searchQuery,
  ]);

  const karaokeCount = useMemo(
    () => filteredNights.filter((n) => n.nightType === "karaoke").length,
    [filteredNights]
  );
  const openMicCount = useMemo(
    () => filteredNights.filter((n) => n.nightType === "open_mic").length,
    [filteredNights]
  );

  const geocodedNights = useMemo(
    () =>
      filteredNights.filter(
        (n) => n.lat !== null && n.lng !== null && n.geocodeStatus === "geocoded"
      ),
    [filteredNights]
  );

  const activePinNight = useMemo(
    () =>
      filteredNights.find((n) => n.id === activeNightId) ||
      filteredNights[0] ||
      null,
    [filteredNights, activeNightId]
  );

  // Project lat/lng onto SVG viewport (0..600 width, 0..360 height)
  function projectCoords(lat: number, lng: number) {
    const minLat = 41.25;
    const maxLat = 41.68;
    const minLng = -81.95;
    const maxLng = -81.34;
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 540 + 30;
    const y = ((maxLat - clampedLat) / (maxLat - minLat)) * 300 + 30;
    return { x, y };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Hero & Search Bar (Mockup 3 direction) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151525] via-[#0B0B14] to-[#1E1E34] p-6 shadow-[0_0_50px_rgba(255,46,147,0.12)] sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-xs font-semibold text-[#00F0FF]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {APP_NAME} • {DEFAULT_CITY} Launch Directory
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#F8F9FA] sm:text-5xl">
              {pageTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#A0A3BD] sm:text-base">
              {pageSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div
              className="rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 px-3.5 py-2 font-semibold text-[#00E676]"
              data-testid="public-verified-count"
            >
              {initialNights.length} Verified Public Nights
            </div>
            <div
              className="rounded-xl border border-white/15 bg-[#151525] px-3.5 py-2 font-semibold text-[#F8F9FA]"
              data-testid="filtered-nights-count"
            >
              Showing {filteredNights.length} ({karaokeCount} Karaoke •{" "}
              {openMicCount} Open Mic)
            </div>
          </div>
        </div>

        {/* Neon Search & Filter Bar */}
        <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#00F0FF]/30 bg-[#0B0B14]/90 p-3 shadow-[0_0_25px_rgba(0,240,255,0.1)] md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#A0A3BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Cleveland venue, neighborhood, or KJ..."
              className="w-full rounded-xl border border-white/10 bg-[#151525] py-2.5 pl-10 pr-3 text-sm text-[#F8F9FA] placeholder-[#A0A3BD] focus:border-[#00F0FF] focus:outline-none"
              data-testid="search-input"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#151525] px-3 py-2.5 text-sm text-[#F8F9FA] focus:border-[#FF2E93] focus:outline-none"
              aria-label="Filter by Genre Fit"
              data-testid="genre-filter-select"
            >
              <option value="ALL">All Genres (Includes Unreported)</option>
              {GENRE_TAXONOMY.map((genre) => (
                <option key={genre} value={genre}>
                  Genre Fit: {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#151525] px-3 py-2.5 text-sm text-[#F8F9FA] focus:border-[#00F0FF] focus:outline-none"
              aria-label="Filter by Neighborhood"
              data-testid="neighborhood-filter-select"
            >
              {NEIGHBORHOOD_OPTIONS.map((nb) => (
                <option key={nb} value={nb}>
                  {nb === "ALL" ? "All Neighborhoods" : nb}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 md:col-span-3">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                selectedType === "ALL"
                  ? "bg-white text-[#0B0B14]"
                  : "bg-[#151525] text-[#A0A3BD] hover:text-white"
              }`}
              data-testid="type-filter-all"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("karaoke")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                selectedType === "karaoke"
                  ? "bg-[#FF2E93] text-white shadow-[0_0_15px_rgba(255,46,147,0.5)]"
                  : "bg-[#151525] text-[#A0A3BD] hover:text-white"
              }`}
              data-testid="type-filter-karaoke"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Karaoke</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("open_mic")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                selectedType === "open_mic"
                  ? "bg-[#00F0FF] text-[#0B0B14] shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                  : "bg-[#151525] text-[#A0A3BD] hover:text-white"
              }`}
              data-testid="type-filter-open-mic"
            >
              <Music className="h-3.5 w-3.5" />
              <span>Open Mic</span>
            </button>
          </div>
        </div>

        {/* Day of Week & Format Filter Rail */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {DAY_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setSelectedDay(chip.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedDay === chip.value
                    ? "bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] text-[#0B0B14] shadow-md"
                    : "border border-white/10 bg-[#151525] text-[#A0A3BD] hover:border-white/30 hover:text-white"
                }`}
                data-testid={`day-chip-${chip.value}`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#00F0FF]" />
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#151525] px-2.5 py-1 text-xs text-[#F8F9FA]"
              data-testid="format-filter-select"
            >
              <option value="ALL">All Formats</option>
              <option value="Open Bar Karaoke">Open Bar Karaoke</option>
              <option value="Private Rooms">Private Rooms (KTV)</option>
              <option value="Open Mic Stage">Open Mic Stage</option>
            </select>
          </div>
        </div>

        {/* Genre Truthfulness Notice Banner when filtering by a specific genre */}
        {selectedGenre !== "ALL" && (
          <div
            className="mt-4 flex items-center justify-between rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2.5 text-xs text-[#F8F9FA]"
            data-testid="genre-truthfulness-banner"
          >
            <span>
              <strong>Genre Truthfulness Active:</strong> Showing only the{" "}
              <strong>{filteredNights.length}</strong> verified night(s) with sourced{" "}
              <strong>{selectedGenre}</strong> fit (Primary or Also Welcome). Nights with{" "}
              <code>UNKNOWN</code> genre fit are never presented as a match.
            </span>
            <button
              type="button"
              onClick={() => setSelectedGenre("ALL")}
              className="ml-4 rounded-lg bg-[#00F0FF] px-2.5 py-1 font-bold text-[#0B0B14]"
            >
              Clear Genre Filter
            </button>
          </div>
        )}
      </section>

      {/* Split Map + Tonight / Directory List */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Sticky Neon-Noir Cleveland Map (Mockup 1 direction) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl border border-white/10 bg-[#151525] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-[#F8F9FA]">
                  Greater Cleveland Interactive Map
                </h2>
                <p className="text-xs text-[#A0A3BD]">
                  {geocodedNights.length} geocoded pins shown •{" "}
                  <span className="text-[#FF2E93]">● Karaoke</span>{" "}
                  <span className="text-[#00F0FF]">● Open Mic</span>
                </p>
              </div>
              <span className="font-mono-code rounded-md bg-[#0B0B14] px-2 py-1 text-[11px] text-[#00E676]">
                LIVE GEO
              </span>
            </div>

            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B14]"
              data-testid="cleveland-interactive-map"
            >
              <svg
                viewBox="0 0 600 360"
                className="h-72 w-full sm:h-80"
                role="img"
                aria-label="Greater Cleveland Karaoke and Open Mic Map"
              >
                <defs>
                  <radialGradient id="lakeGlow" cx="50%" cy="0%" r="80%">
                    <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#0B0B14" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* Lake Erie coastline & grid */}
                <rect width="600" height="360" fill="#0B0B14" />
                <path
                  d="M 0 0 L 600 0 L 600 55 Q 440 85 300 105 Q 150 125 0 140 Z"
                  fill="url(#lakeGlow)"
                />
                <path
                  d="M 0 140 Q 150 125 300 105 Q 440 85 600 55"
                  stroke="#00F0FF"
                  strokeOpacity="0.35"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Highway / arterial grid lines (I-90, I-71, I-77, I-480) */}
                <path
                  d="M 20 165 Q 240 135 580 75"
                  stroke="#1E1E34"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M 295 105 L 315 350"
                  stroke="#1E1E34"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M 295 105 L 145 350"
                  stroke="#1E1E34"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M 30 225 L 570 220"
                  stroke="#1E1E34"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />

                {/* Neighborhood labels */}
                <text x="45" y="45" fill="#00F0FF" fillOpacity="0.45" fontSize="11" fontWeight="600">
                  LAKE ERIE
                </text>
                <text x="165" y="160" fill="#A0A3BD" fillOpacity="0.6" fontSize="10">
                  Lakewood
                </text>
                <text x="260" y="140" fill="#F8F9FA" fillOpacity="0.8" fontSize="10" fontWeight="700">
                  Ohio City / Tremont
                </text>
                <text x="365" y="135" fill="#A0A3BD" fillOpacity="0.6" fontSize="10">
                  Coventry / Cle Hts
                </text>
                <text x="235" y="255" fill="#A0A3BD" fillOpacity="0.6" fontSize="10">
                  Parma
                </text>
                <text x="120" y="280" fill="#A0A3BD" fillOpacity="0.6" fontSize="10">
                  Berea
                </text>

                {/* Venue Pins */}
                {geocodedNights.map((night) => {
                  const { x, y } = projectCoords(night.lat!, night.lng!);
                  const isSelected = activePinNight?.id === night.id;
                  const pinColor =
                    night.nightType === "open_mic" ? "#00F0FF" : "#FF2E93";
                  return (
                    <g
                      key={night.id}
                      onClick={() => setActiveNightId(night.id)}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <circle
                          cx={x}
                          cy={y}
                          r={13}
                          fill={pinColor}
                          fillOpacity={0.28}
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 7 : 5}
                        fill={pinColor}
                        stroke="#0B0B14"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Pin Card Preview */}
            {activePinNight && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#1E1E34] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        activePinNight.nightType === "open_mic"
                          ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                          : "bg-[#FF2E93]/20 text-[#FF2E93]"
                      }`}
                    >
                      {activePinNight.nightTypeLabel} • {activePinNight.dayOfWeek}
                    </span>
                    <h3 className="font-display mt-1 text-lg font-bold text-[#F8F9FA]">
                      {activePinNight.venueName}
                    </h3>
                    <p className="text-xs text-[#A0A3BD]">
                      {activePinNight.neighborhood} •{" "}
                      {activePinNight.address || "Address Pending Verification"}
                    </p>
                  </div>
                  <span className="font-mono-code rounded-lg border border-white/10 bg-[#0B0B14] px-2 py-1 text-xs text-[#00F0FF]">
                    {activePinNight.roomCode}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href={`/nights/${activePinNight.slug}`}
                    className="rounded-lg bg-[#FF2E93] px-3 py-1.5 font-bold text-white hover:opacity-90"
                  >
                    Night Details
                  </Link>
                  <Link
                    href={`/venues/${activePinNight.venueSlug}`}
                    className="rounded-lg border border-white/20 bg-[#151525] px-3 py-1.5 font-semibold text-[#F8F9FA] hover:border-[#00F0FF]"
                  >
                    Venue Page
                  </Link>
                  <Link
                    href={`/room/${activePinNight.roomCode}`}
                    className="rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 font-semibold text-[#00F0FF]"
                  >
                    Join Live Room
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right / Verified Nights Directory List */}
        <div className="space-y-4 lg:col-span-7" data-testid="verified-nights-list">
          {filteredNights.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#151525] p-10 text-center">
              <p className="font-display text-lg font-bold text-[#F8F9FA]">
                No verified nights match this exact filter combination.
              </p>
              <p className="mt-1 text-xs text-[#A0A3BD]">
                Remember: nights with <code>UNKNOWN</code> genre fit are never returned as false matches when filtering by genre.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDay("ALL");
                  setSelectedType("ALL");
                  setSelectedGenre("ALL");
                  setSelectedNeighborhood("ALL");
                  setSelectedFormat("ALL");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl bg-[#FF2E93] px-4 py-2 text-xs font-bold text-white"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredNights.map((night) => {
              const isUnknownGenre =
                night.primaryGenre === "UNKNOWN" &&
                night.alsoWelcome === "UNKNOWN";

              return (
                <article
                  key={night.id}
                  onClick={() => setActiveNightId(night.id)}
                  className="group rounded-2xl border border-white/10 bg-[#1E1E34]/90 p-5 transition hover:border-[#00F0FF]/50"
                  data-testid="verified-night-card"
                  data-night-id={night.id}
                  data-confidence={night.confidence}
                  data-primary-genre={night.primaryGenre}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            night.nightType === "open_mic"
                              ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                              : "bg-[#FF2E93]/20 text-[#FF2E93]"
                          }`}
                        >
                          {night.nightType === "open_mic" ? (
                            <Music className="h-3 w-3" />
                          ) : (
                            <Mic className="h-3 w-3" />
                          )}
                          {night.nightTypeLabel}
                        </span>

                        <span className="rounded-full border border-white/10 bg-[#151525] px-2.5 py-0.5 text-xs font-medium text-[#F8F9FA]">
                          {night.formatType}
                        </span>

                        {/* Freshness Badge (<45d Verified vs 45-89d Call to confirm) */}
                        {night.freshnessStatus === "call_to_confirm" ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-2.5 py-0.5 text-xs font-bold text-[#FFB800]"
                            data-testid="freshness-badge-warning"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Call to confirm • Needs Re-Verification ({night.daysSinceConfirmed}d)
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-2.5 py-0.5 text-xs font-bold text-[#00E676]"
                            data-testid="freshness-badge-verified"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>

                      <h3 className="font-display mt-2 text-xl font-bold text-[#F8F9FA]">
                        <Link
                          href={`/venues/${night.venueSlug}`}
                          className="hover:text-[#00F0FF]"
                        >
                          {night.venueName}
                        </Link>
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A0A3BD]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#FF2E93]" />
                          {night.neighborhood} •{" "}
                          {night.address || (
                            <span className="italic text-[#FFB800]">
                              Address Pending Verification
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#F8F9FA]">
                          <Clock className="h-3.5 w-3.5 text-[#00F0FF]" />
                          {night.dayOfWeek !== "UNKNOWN" ? (
                            night.dayOfWeek
                          ) : (
                            <span className="text-[#FFB800]">
                              Day Pending Verification
                            </span>
                          )}{" "}
                          •{" "}
                          {night.startTime !== "UNKNOWN" ? (
                            night.startTime
                          ) : (
                            <span
                              className="text-[#FFB800]"
                              data-testid="unknown-time-badge"
                            >
                              Pending Verification — Know the details? Submit an update
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-mono-code rounded-lg border border-white/10 bg-[#0B0B14] px-2.5 py-1 text-xs font-semibold text-[#00F0FF]">
                        Room {night.roomCode}
                      </span>
                      {night.hostSlug ? (
                        <Link
                          href={`/hosts/${night.hostSlug}`}
                          className="text-xs font-semibold text-[#FF2E93] hover:underline"
                        >
                          Host: {night.hostOrKj}
                        </Link>
                      ) : (
                        <span className="text-xs text-[#A0A3BD]">
                          Host:{" "}
                          {night.hostOrKj === "UNKNOWN"
                            ? "Pending Verification"
                            : night.hostOrKj}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Genre-Fit Differentiator Block */}
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#151525] p-3.5 text-xs">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#A0A3BD]">
                          Primary Genre
                        </span>
                        {night.primaryGenre !== "UNKNOWN" ? (
                          <span className="mt-0.5 inline-block rounded-md bg-[#FF2E93]/20 px-2 py-0.5 font-bold text-[#FF2E93]">
                            {night.primaryGenre}
                          </span>
                        ) : (
                          <span
                            className="mt-0.5 inline-flex items-center gap-1 text-[#FFB800]"
                            data-testid="unknown-genre-badge"
                          >
                            <HelpCircle className="h-3 w-3" />
                            Pending Verification (Genre fit not yet reported)
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#A0A3BD]">
                          Also Welcome
                        </span>
                        {night.alsoWelcome !== "UNKNOWN" ? (
                          <span className="mt-0.5 inline-block rounded-md bg-[#00F0FF]/15 px-2 py-0.5 font-semibold text-[#00F0FF]">
                            {night.alsoWelcome}
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block text-[#A0A3BD]">
                            Pending Verification
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#A0A3BD]">
                          Not a Fit
                        </span>
                        {night.notAFit !== "UNKNOWN" ? (
                          <span className="mt-0.5 inline-block font-semibold text-rose-400">
                            {night.notAFit}
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block text-[#A0A3BD]">
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px] text-[#A0A3BD]">
                      <span>
                        <strong>Basis ({night.assertedBy}):</strong>{" "}
                        {night.genreBasis}
                      </span>
                      {night.sourceUrl && (
                        <a
                          href={night.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#00F0FF] hover:underline"
                        >
                          <span>Source</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Card Footer CTAs */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/nights/${night.slug}`}
                        className="rounded-xl bg-[#151525] px-3 py-1.5 font-semibold text-[#F8F9FA] hover:bg-white/10"
                      >
                        Night Page
                      </Link>
                      <Link
                        href={`/venues/${night.venueSlug}`}
                        className="rounded-xl bg-[#151525] px-3 py-1.5 font-semibold text-[#F8F9FA] hover:bg-white/10"
                      >
                        Venue Detail
                      </Link>
                      <Link
                        href={`/room/${night.roomCode}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#FF2E93]/40 bg-[#FF2E93]/15 px-3 py-1.5 font-bold text-[#FF2E93] hover:bg-[#FF2E93]/25"
                      >
                        <Radio className="h-3.5 w-3.5" />
                        <span>Live Room / Song Request</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCorrectionTarget({
                            nightId: night.id,
                            venueName: night.venueName,
                            defaultField: isUnknownGenre
                              ? "primaryGenre"
                              : "startTime",
                          })
                        }
                        className="rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/20"
                        data-testid="open-correction-modal-btn"
                      >
                        Submit an Update
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setClaimTarget({
                            targetType: "night",
                            targetId: night.id,
                            targetName: `${night.venueName} (${night.dayOfWeek})`,
                          })
                        }
                        className="rounded-xl border border-white/15 bg-[#151525] px-3 py-1.5 font-semibold text-[#A0A3BD] hover:text-white"
                        data-testid="open-claim-modal-btn"
                      >
                        Claim
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Correction Modal */}
      {correctionTarget && (
        <CorrectionModal
          isOpen={true}
          onClose={() => setCorrectionTarget(null)}
          nightId={correctionTarget.nightId}
          venueName={correctionTarget.venueName}
          defaultField={correctionTarget.defaultField}
        />
      )}

      {/* Claim Modal */}
      {claimTarget && (
        <ClaimModal
          isOpen={true}
          onClose={() => setClaimTarget(null)}
          targetType={claimTarget.targetType}
          targetId={claimTarget.targetId}
          targetName={claimTarget.targetName}
        />
      )}
    </div>
  );
}
