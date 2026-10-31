"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  NightRecord,
  distanceMiles,
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
  Filter,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  ChevronUp,
  ChevronDown,
  Layers,
} from "lucide-react";

interface DiscoveryViewProps {
  initialNights: NightRecord[];
  defaultDay?: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

const CLEVELAND_CENTER = { lat: 41.4993, lng: -81.6944 };

const FULL_METRO_BOUNDS = {
  north: 41.88,
  south: 41.05,
  east: -80.92,
  west: -82.15,
};

const QUICK_VIEWPORTS: Record<
  string,
  { label: string; north: number; south: number; east: number; west: number; zoom: number }
> = {
  ALL_METRO: {
    label: "All Greater Cleveland",
    ...FULL_METRO_BOUNDS,
    zoom: 1,
  },
  WEST_SIDE: {
    label: "Lakewood & West Side",
    north: 41.51,
    south: 41.44,
    east: -81.72,
    west: -81.93,
    zoom: 2.2,
  },
  CORE_CLE: {
    label: "Tremont, Ohio City & Downtown",
    north: 41.53,
    south: 41.46,
    east: -81.63,
    west: -81.76,
    zoom: 2.4,
  },
  EAST_SIDE: {
    label: "Coventry, Cle Hts & East Side",
    north: 41.62,
    south: 41.47,
    east: -81.45,
    west: -81.62,
    zoom: 2.0,
  },
  SOUTH_SUBURBS: {
    label: "Parma, Berea & South",
    north: 41.45,
    south: 41.31,
    east: -81.66,
    west: -81.88,
    zoom: 2.0,
  },
};

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
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] =
    useState<boolean>(false);

  // Map viewport & user location state (modeled on RestoreRecess MapInterface.tsx)
  const [viewportPreset, setViewportPreset] = useState<string>("ALL_METRO");
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  }>(FULL_METRO_BOUNDS);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [userLocation] = useState<{ lat: number; lng: number }>(
    CLEVELAND_CENTER
  );

  const [activeNightId, setActiveNightId] = useState<string | null>(
    initialNights[0]?.id || null
  );

  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

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

  // Step 1: All public verified nights matching the user's active filters
  const filteredNights = useMemo(() => {
    return initialNights.filter((night) => {
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

  // Step 2: Coordinate Discipline (Recess Lake-Pin Lesson)
  // NEVER pin a night without real street-address coordinates.
  // Nights with null coordinates (e.g. Imposters Theater) never get a map pin and appear in the list with "Location pending".
  const inViewPinnedNights = useMemo(() => {
    return filteredNights.filter((n) => {
      if (
        n.lat === null ||
        n.lng === null ||
        n.geocodeStatus !== "geocoded"
      ) {
        return false;
      }
      return (
        n.lat <= mapBounds.north &&
        n.lat >= mapBounds.south &&
        n.lng <= mapBounds.east &&
        n.lng >= mapBounds.west
      );
    });
  }, [filteredNights, mapBounds]);

  const locationPendingNights = useMemo(() => {
    return filteredNights.filter(
      (n) => n.lat === null || n.lng === null || n.geocodeStatus !== "geocoded"
    );
  }, [filteredNights]);

  // Step 3: "Nights in View" sorted by distance ("Closest first" from userLocation / Cleveland center)
  const nightsInViewSorted = useMemo(() => {
    const pinnedSorted = [...inViewPinnedNights].sort((a, b) => {
      const distA = distanceMiles(
        userLocation.lat,
        userLocation.lng,
        a.lat!,
        a.lng!
      );
      const distB = distanceMiles(
        userLocation.lat,
        userLocation.lng,
        b.lat!,
        b.lng!
      );
      return distA - distB;
    });
    return [...pinnedSorted, ...locationPendingNights];
  }, [inViewPinnedNights, locationPendingNights, userLocation]);

  const karaokeCount = useMemo(
    () => nightsInViewSorted.filter((n) => n.nightType === "karaoke").length,
    [nightsInViewSorted]
  );
  const openMicCount = useMemo(
    () => nightsInViewSorted.filter((n) => n.nightType === "open_mic").length,
    [nightsInViewSorted]
  );

  // Venue pin counts for multi-night cluster badge indicator on the map
  const venuePinCounts = useMemo(() => {
    const counts = new Map<string, number>();
    inViewPinnedNights.forEach((n) => {
      counts.set(n.venueSlug, (counts.get(n.venueSlug) || 0) + 1);
    });
    return counts;
  }, [inViewPinnedNights]);

  const activePinNight = useMemo(
    () =>
      nightsInViewSorted.find((n) => n.id === activeNightId) ||
      nightsInViewSorted[0] ||
      null,
    [nightsInViewSorted, activeNightId]
  );

  // Project lat/lng onto SVG viewport (0..600 width, 0..380 height)
  // Note: Lake Erie is rendered in the top band (y: 0..68), and land pins are strictly projected onto y: 82..355 so zero pins ever fall in Lake Erie.
  function projectCoords(lat: number, lng: number, indexOffset = 0) {
    const minLat = mapBounds.south;
    const maxLat = mapBounds.north;
    const minLng = mapBounds.west;
    const maxLng = mapBounds.east;
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    const baseX =
      ((clampedLng - minLng) / Math.max(0.01, maxLng - minLng)) * 520 + 40;
    const baseY =
      ((maxLat - clampedLat) / Math.max(0.01, maxLat - minLat)) * 255 + 88;
    // Slight deterministic offset for multi-night venues at the exact same address so every night pin is individually clickable
    const angle = (indexOffset * 137.5 * Math.PI) / 180;
    const radius = indexOffset > 0 ? Math.min(8, indexOffset * 2.5) : 0;
    const x = Math.max(24, Math.min(576, baseX + Math.cos(angle) * radius));
    const y = Math.max(82, Math.min(358, baseY + Math.sin(angle) * radius));
    return { x, y };
  }

  function handleZoomIn() {
    const latSpan = (mapBounds.north - mapBounds.south) * 0.72;
    const lngSpan = (mapBounds.east - mapBounds.west) * 0.72;
    const centerLat = (mapBounds.north + mapBounds.south) / 2;
    const centerLng = (mapBounds.east + mapBounds.west) / 2;
    setMapBounds({
      north: centerLat + latSpan / 2,
      south: centerLat - latSpan / 2,
      east: centerLng + lngSpan / 2,
      west: centerLng - lngSpan / 2,
    });
    setZoomLevel((z) => Math.min(4, Number((z * 1.35).toFixed(1))));
    setViewportPreset("CUSTOM");
  }

  function handleZoomOut() {
    setMapBounds(FULL_METRO_BOUNDS);
    setZoomLevel(1);
    setViewportPreset("ALL_METRO");
  }

  function applyQuickViewport(presetKey: string) {
    const preset = QUICK_VIEWPORTS[presetKey] || QUICK_VIEWPORTS.ALL_METRO;
    setViewportPreset(presetKey);
    setMapBounds({
      north: preset.north,
      south: preset.south,
      east: preset.east,
      west: preset.west,
    });
    setZoomLevel(preset.zoom);
  }

  function handleSelectPinOnMap(night: NightRecord) {
    setActiveNightId(night.id);
    const el = cardRefs.current[night.id];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleSelectCardInList(night: NightRecord) {
    setActiveNightId(night.id);
    if (night.lat !== null && night.lng !== null) {
      // Ensure the selected night is inside the current map bounds
      if (
        night.lat > mapBounds.north ||
        night.lat < mapBounds.south ||
        night.lng > mapBounds.east ||
        night.lng < mapBounds.west
      ) {
        setMapBounds(FULL_METRO_BOUNDS);
        setZoomLevel(1);
        setViewportPreset("ALL_METRO");
      }
    }
  }

  const venueOccurrenceSeen = new Map<string, number>();

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#0B0B14]">
      {/* Map-First Split Layout (Mobile: Map top + Bottom Sheet; Desktop: 7/5 Split) */}
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-12">
        {/* LEFT / TOP: Interactive Cleveland Map + Recess-Style Top Filter Overlay */}
        <section
          className="relative flex flex-col border-b border-white/10 bg-[#0B0B14] lg:col-span-7 lg:min-h-[calc(100vh-88px)] lg:border-b-0 lg:border-r"
          aria-label={pageTitle}
        >
          {/* TOP FILTER OVERLAY CARD (Recess MapInterface.tsx pattern — zero horizontal overflow at 360px-412px) */}
          <div className="z-20 w-full border-b border-white/10 bg-[#0B0B14]/95 px-2.5 py-2 backdrop-blur-xl sm:px-4 sm:py-3">
            {/* Row 1: Time / Day Pills + Verified Counter */}
            <div
              className="flex flex-wrap items-center justify-between gap-1.5"
              data-testid="map-filter-row-1"
            >
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDay("ALL")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition sm:px-2.5 ${
                    selectedDay === "ALL"
                      ? "bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] text-[#0B0B14] shadow-sm"
                      : "border border-white/10 bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="day-chip-ALL"
                >
                  All ({initialNights.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("Friday")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition sm:px-2.5 ${
                    selectedDay === "Friday" || selectedDay === "Tonight"
                      ? "bg-[#FF2E93] text-white shadow-sm"
                      : "border border-white/10 bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="day-chip-Friday"
                >
                  Tonight
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("Saturday")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition sm:px-2.5 ${
                    selectedDay === "Saturday"
                      ? "bg-[#FF2E93] text-white shadow-sm"
                      : "border border-white/10 bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="day-chip-Saturday"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("Weekend")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition sm:px-2.5 ${
                    selectedDay === "Weekend"
                      ? "bg-[#00F0FF] text-[#0B0B14] shadow-sm"
                      : "border border-white/10 bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="day-chip-Weekend"
                >
                  Weekend
                </button>
                <select
                  value={
                    [
                      "ALL",
                      "Friday",
                      "Saturday",
                      "Weekend",
                    ].includes(selectedDay)
                      ? ""
                      : selectedDay
                  }
                  onChange={(e) =>
                    setSelectedDay(e.target.value || "ALL")
                  }
                  aria-label="Pick Day of Week"
                  className="max-w-[92px] rounded-lg border border-white/10 bg-[#151525] px-1.5 py-1 text-[11px] font-semibold text-[#F8F9FA] sm:max-w-[115px]"
                  data-testid="day-select-picker"
                >
                  <option value="">Pick Day...</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div
                className="hidden items-center gap-1 rounded-lg border border-[#00E676]/40 bg-[#00E676]/10 px-2 py-1 text-[11px] font-bold text-[#00E676] sm:inline-flex"
                data-testid="public-verified-count"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>{initialNights.length} Verified Public Nights</span>
              </div>
            </div>

            {/* Row 2: Type Pills + Genre-Fit Selector + More Filters Toggle */}
            <div
              className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5"
              data-testid="map-filter-row-2"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedType("ALL")}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
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
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    selectedType === "karaoke"
                      ? "bg-[#FF2E93] text-white shadow-[0_0_12px_rgba(255,46,147,0.45)]"
                      : "bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="type-filter-karaoke"
                >
                  <Mic className="h-3 w-3" />
                  <span>Karaoke</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("open_mic")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    selectedType === "open_mic"
                      ? "bg-[#00F0FF] text-[#0B0B14] shadow-[0_0_12px_rgba(0,240,255,0.45)]"
                      : "bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="type-filter-open-mic"
                >
                  <Music className="h-3 w-3" />
                  <span>Open Mic</span>
                </button>
              </div>

              <div className="flex flex-1 items-center justify-end gap-1 min-w-[140px]">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="max-w-[145px] flex-1 truncate rounded-lg border border-white/10 bg-[#151525] px-2 py-1 text-[11px] font-semibold text-[#F8F9FA] focus:border-[#FF2E93] focus:outline-none sm:max-w-[200px]"
                  aria-label="Filter by Genre Fit"
                  data-testid="genre-filter-select"
                >
                  <option value="ALL">Genre: All Fits</option>
                  {GENRE_TAXONOMY.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowMoreFilters((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    showMoreFilters ||
                    selectedNeighborhood !== "ALL" ||
                    selectedFormat !== "ALL" ||
                    searchQuery !== ""
                      ? "border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]"
                      : "border-white/10 bg-[#151525] text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid="open-filter-drawer-btn"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Compact Search & Neighborhood / Format Row (Always in DOM for accessibility & tests, compact on mobile) */}
            <div
              className={`mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-12 ${
                showMoreFilters ? "block" : "hidden sm:grid"
              }`}
            >
              <div className="relative sm:col-span-5">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#A0A3BD]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search venue, neighborhood, or KJ..."
                  className="w-full rounded-lg border border-white/10 bg-[#151525] py-1.5 pl-8 pr-2.5 text-xs text-[#F8F9FA] placeholder-[#A0A3BD] focus:border-[#00F0FF] focus:outline-none"
                  data-testid="search-input"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#151525] px-2.5 py-1.5 text-xs text-[#F8F9FA]"
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

              <div className="sm:col-span-3">
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#151525] px-2.5 py-1.5 text-xs text-[#F8F9FA]"
                  data-testid="format-filter-select"
                >
                  <option value="ALL">All Formats</option>
                  <option value="Open Bar Karaoke">Open Bar Karaoke</option>
                  <option value="Private Rooms">Private Rooms (KTV)</option>
                  <option value="Open Mic Stage">Open Mic Stage</option>
                </select>
              </div>
            </div>

            {/* Genre Truthfulness Active Banner */}
            {selectedGenre !== "ALL" && (
              <div
                className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 text-[11px] text-[#F8F9FA]"
                data-testid="genre-truthfulness-banner"
              >
                <span>
                  <strong>Genre Truthfulness Active:</strong> Showing only the{" "}
                  <strong>{filteredNights.length}</strong> verified night(s) with sourced{" "}
                  <strong>{selectedGenre}</strong> fit. <code>UNKNOWN</code> fits are never shown as matches.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGenre("ALL")}
                  className="rounded bg-[#00F0FF] px-2 py-0.5 text-[10px] font-bold text-[#0B0B14]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* FULL-VIEWPORT INTERACTIVE CLEVELAND STAGE MAP */}
          <div
            className="relative flex-1 overflow-hidden bg-[#0B0B14]"
            data-testid="cleveland-interactive-map"
          >
            {/* Quick Metro Region Jump Pills (Top-left inside map canvas) */}
            <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-56px)] flex-wrap items-center gap-1">
              {Object.entries(QUICK_VIEWPORTS).map(([key, vp]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyQuickViewport(key)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md transition ${
                    viewportPreset === key
                      ? "border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF]"
                      : "border border-white/10 bg-[#0B0B14]/80 text-[#A0A3BD] hover:text-white"
                  }`}
                  data-testid={`map-region-${key}`}
                >
                  {vp.label}
                </button>
              ))}
            </div>

            {/* Map Zoom & Reset Controls (Top-right inside map canvas) */}
            <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom In"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#0B0B14]/90 text-[#F8F9FA] shadow-lg hover:border-[#00F0FF] hover:text-[#00F0FF]"
                data-testid="map-zoom-in-btn"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Reset Full Metro View"
                aria-label="Reset Full Metro View"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#0B0B14]/90 text-[#F8F9FA] shadow-lg hover:border-[#FF2E93] hover:text-[#FF2E93]"
                data-testid="map-reset-view-btn"
              >
                {zoomLevel > 1 ? (
                  <ZoomOut className="h-4 w-4" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Interactive SVG Map Canvas */}
            <svg
              viewBox="0 0 600 380"
              className="h-[340px] w-full select-none sm:h-[430px] lg:h-[calc(100vh-230px)] lg:min-h-[500px]"
              role="img"
              aria-label={`${APP_NAME} ${DEFAULT_CITY} Interactive Stage Map`}
            >
              <defs>
                <radialGradient id="lakeGlow" cx="50%" cy="0%" r="80%">
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0B0B14" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="600" height="380" fill="#0B0B14" />

              {/* Lake Erie Water Band (strictly north of shoreline y=72 so zero land pins ever sit in the lake) */}
              <path
                d="M 0 0 L 600 0 L 600 48 Q 440 65 300 72 Q 150 78 0 80 Z"
                fill="url(#lakeGlow)"
              />
              <path
                d="M 0 80 Q 150 78 300 72 Q 440 65 600 48"
                stroke="#00F0FF"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
              />

              {/* Greater Cleveland Highway Corridors (I-90, I-71, I-77, I-480, I-271) */}
              <path
                d="M 15 110 Q 250 96 585 68"
                stroke="#1E1E34"
                strokeWidth="2.2"
                fill="none"
              />
              <path
                d="M 295 74 L 315 370"
                stroke="#1E1E34"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 295 74 L 135 370"
                stroke="#1E1E34"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 455 70 L 460 365"
                stroke="#1E1E34"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
              />
              <path
                d="M 20 215 L 580 210"
                stroke="#1E1E34"
                strokeWidth="1.5"
                strokeDasharray="5 5"
                fill="none"
              />

              {/* Geographic Labels */}
              <text
                x="28"
                y="46"
                fill="#00F0FF"
                fillOpacity="0.45"
                fontSize="10"
                fontWeight="700"
                letterSpacing="1.5"
              >
                LAKE ERIE (ZERO PINS IN WATER)
              </text>
              <text
                x="150"
                y="128"
                fill="#A0A3BD"
                fillOpacity="0.65"
                fontSize="10"
                fontWeight="600"
              >
                Lakewood
              </text>
              <text
                x="255"
                y="112"
                fill="#F8F9FA"
                fillOpacity="0.85"
                fontSize="10.5"
                fontWeight="700"
              >
                Downtown / Ohio City / Tremont
              </text>
              <text
                x="395"
                y="125"
                fill="#A0A3BD"
                fillOpacity="0.65"
                fontSize="10"
                fontWeight="600"
              >
                Coventry / Cle Hts
              </text>
              <text
                x="490"
                y="96"
                fill="#A0A3BD"
                fillOpacity="0.65"
                fontSize="10"
              >
                Euclid / Mentor
              </text>
              <text
                x="230"
                y="235"
                fill="#A0A3BD"
                fillOpacity="0.65"
                fontSize="10"
              >
                Parma / Parma Hts
              </text>
              <text
                x="110"
                y="265"
                fill="#A0A3BD"
                fillOpacity="0.65"
                fontSize="10"
              >
                Berea / Westlake
              </text>

              {/* Geocoded Venue Pins inside Current Map Bounds */}
              {inViewPinnedNights.map((night) => {
                const occIndex = venueOccurrenceSeen.get(night.venueSlug) || 0;
                venueOccurrenceSeen.set(night.venueSlug, occIndex + 1);

                const { x, y } = projectCoords(
                  night.lat!,
                  night.lng!,
                  occIndex
                );
                const isSelected = activePinNight?.id === night.id;
                const pinColor =
                  night.nightType === "open_mic" ? "#00F0FF" : "#FF2E93";
                const multiCount = venuePinCounts.get(night.venueSlug) || 1;

                return (
                  <g
                    key={night.id}
                    onClick={() => handleSelectPinOnMap(night)}
                    className="cursor-pointer"
                    data-testid="map-pin"
                    data-night-id={night.id}
                    data-night-type={night.nightType}
                    data-lat={night.lat}
                    data-lng={night.lng}
                  >
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={15}
                        fill={pinColor}
                        fillOpacity={0.28}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 7.5 : 5.5}
                      fill={pinColor}
                      stroke="#0B0B14"
                      strokeWidth={1.6}
                    />
                    {multiCount > 1 && occIndex === 0 && (
                      <g transform={`translate(${x + 6}, ${y - 6})`}>
                        <circle
                          cx={0}
                          cy={0}
                          r={6.5}
                          fill="#151525"
                          stroke={pinColor}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill="#F8F9FA"
                          fontSize="8"
                          fontWeight="700"
                        >
                          {multiCount}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Bottom-Left On-Map Legend (Modeled on RestoreRecess MapInterface.tsx) */}
            <div
              className="absolute bottom-2.5 left-2.5 z-10 rounded-xl border border-white/15 bg-[#0B0B14]/90 px-2.5 py-2 text-[10px] text-[#F8F9FA] shadow-xl backdrop-blur-md"
              data-testid="map-legend"
            >
              <div className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wider text-[#A0A3BD]">
                <Layers className="h-3 w-3 text-[#00F0FF]" />
                <span>Stage Map Legend</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF2E93] shadow-[0_0_8px_#FF2E93]" />
                  <span>Karaoke ({karaokeCount})</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
                  <span>Open Mic ({openMicCount})</span>
                </span>
                <span
                  className="font-mono-code text-[#00E676]"
                  data-testid="in-view-pin-count"
                >
                  {inViewPinnedNights.length} Pins
                </span>
              </div>
            </div>

            {/* Selected Venue On-Map Preview Card (Bottom-Right / Bottom-Center) */}
            {activePinNight && (
              <div
                className="mx-2.5 mb-2.5 rounded-2xl border border-white/15 bg-[#151525]/95 p-3 shadow-2xl backdrop-blur-xl sm:mx-4 sm:mb-3"
                data-testid="map-selected-preview"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          activePinNight.nightType === "open_mic"
                            ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                            : "bg-[#FF2E93]/20 text-[#FF2E93]"
                        }`}
                      >
                        {activePinNight.nightTypeLabel} • {activePinNight.dayOfWeek}
                      </span>
                      <span className="rounded-full bg-[#0B0B14] px-2 py-0.5 text-[10px] font-semibold text-[#00F0FF]">
                        Genre:{" "}
                        {activePinNight.primaryGenre === "UNKNOWN"
                          ? "Pending Verification"
                          : activePinNight.primaryGenre}
                      </span>
                      {activePinNight.lat === null && (
                        <span className="rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-2 py-0.5 text-[10px] font-bold text-[#FFB800]">
                          Location pending
                        </span>
                      )}
                    </div>
                    <h2 className="font-display mt-1 truncate text-base font-bold text-[#F8F9FA] sm:text-lg">
                      {activePinNight.venueName}
                    </h2>
                    <p className="truncate text-xs text-[#A0A3BD]">
                      {activePinNight.neighborhood} •{" "}
                      {activePinNight.address || "Address Pending Verification"} •{" "}
                      {activePinNight.startTime === "UNKNOWN"
                        ? "Time Pending"
                        : activePinNight.startTime}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 text-xs">
                    <Link
                      href={`/nights/${activePinNight.slug}`}
                      className="rounded-lg bg-[#FF2E93] px-2.5 py-1.5 font-bold text-white hover:opacity-90"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/venues/${activePinNight.venueSlug}`}
                      className="rounded-lg border border-white/15 bg-[#0B0B14] px-2.5 py-1.5 font-semibold text-[#F8F9FA] hover:border-[#00F0FF]"
                    >
                      Venue
                    </Link>
                    <Link
                      href={`/room/${activePinNight.roomCode}`}
                      className="rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-2.5 py-1.5 font-semibold text-[#00F0FF]"
                    >
                      {activePinNight.roomCode}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT / BOTTOM SHEET: Synced "Nights in View" Panel (RestoreRecess pattern) */}
        <section
          className="flex flex-col bg-[#0B0B14] lg:col-span-5 lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto"
          data-testid="bottom-sheet-list"
        >
          {/* Sticky Bottom-Sheet / Side-Panel Header */}
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#151525]/95 px-3.5 py-3 backdrop-blur-md sm:px-5">
            {/* Mobile Drag Handle */}
            <button
              type="button"
              onClick={() => setMobileSheetExpanded((prev) => !prev)}
              className="mx-auto mb-2 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-[#A0A3BD] lg:hidden"
              data-testid="mobile-sheet-toggle"
            >
              <span className="h-1 w-10 rounded-full bg-white/20" />
              {mobileSheetExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#00F0FF]" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-[#00F0FF]" />
              )}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-base font-bold text-[#F8F9FA] sm:text-lg">
                  Nights in View • {DEFAULT_METRO}
                </h1>
                <p
                  className="text-xs font-semibold text-[#00F0FF]"
                  data-testid="nights-in-view-count"
                >
                  Showing {nightsInViewSorted.length} of {filteredNights.length}{" "}
                  nights matching your filters
                </p>
              </div>

              <div className="text-right">
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-[#A0A3BD]"
                  data-testid="filtered-nights-count"
                >
                  <Navigation className="h-3 w-3 text-[#00E676]" />
                  <span>
                    Sorted by distance: Closest first ({karaokeCount} Karaoke •{" "}
                    {openMicCount} Open Mic)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Nights in View List */}
          <div
            className={`space-y-3 p-3 sm:p-4 ${
              mobileSheetExpanded ? "max-h-none" : "max-h-[480px] overflow-y-auto lg:max-h-none"
            }`}
            data-testid="verified-nights-list"
          >
            {nightsInViewSorted.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#151525] p-8 text-center">
                <p className="font-display text-base font-bold text-[#F8F9FA]">
                  No verified nights in this map area match your active filters.
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
                    handleZoomOut();
                  }}
                  className="mt-4 rounded-xl bg-[#FF2E93] px-4 py-2 text-xs font-bold text-white"
                >
                  Reset Map &amp; Filters
                </button>
              </div>
            ) : (
              nightsInViewSorted.map((night) => {
                const isUnknownGenre =
                  night.primaryGenre === "UNKNOWN" &&
                  night.alsoWelcome === "UNKNOWN";
                const isLocationPending =
                  night.lat === null ||
                  night.lng === null ||
                  night.geocodeStatus !== "geocoded";
                const isSelected = activePinNight?.id === night.id;
                const distMiles = !isLocationPending
                  ? distanceMiles(
                      userLocation.lat,
                      userLocation.lng,
                      night.lat!,
                      night.lng!
                    ).toFixed(1)
                  : null;

                return (
                  <article
                    key={night.id}
                    ref={(el) => {
                      cardRefs.current[night.id] = el;
                    }}
                    onClick={() => handleSelectCardInList(night)}
                    className={`group cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-[#00F0FF] bg-[#1E1E34] shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                        : "border-white/10 bg-[#1E1E34]/85 hover:border-[#00F0FF]/50"
                    }`}
                    data-testid="verified-night-card"
                    data-night-id={night.id}
                    data-confidence={night.confidence}
                    data-primary-genre={night.primaryGenre}
                    data-has-coords={isLocationPending ? "false" : "true"}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
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

                          <span className="rounded-full border border-white/10 bg-[#151525] px-2 py-0.5 text-[11px] font-medium text-[#F8F9FA]">
                            {night.formatType}
                          </span>

                          {/* Coordinate Discipline: Location pending badge when coordinates are null */}
                          {isLocationPending ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#FFB800]"
                              data-testid="location-pending-badge"
                            >
                              <MapPin className="h-3 w-3" />
                              Location pending
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#0B0B14] px-2 py-0.5 text-[10px] font-semibold text-[#A0A3BD]">
                              {distMiles} mi
                            </span>
                          )}

                          {/* Freshness Badge (<45d Verified vs 45-89d Call to confirm) */}
                          {night.freshnessStatus === "call_to_confirm" ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#FFB800]"
                              data-testid="freshness-badge-warning"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Call to confirm ({night.daysSinceConfirmed}d)
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-2 py-0.5 text-[11px] font-bold text-[#00E676]"
                              data-testid="freshness-badge-verified"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>

                        <h3 className="font-display mt-2 text-lg font-bold text-[#F8F9FA]">
                          <Link
                            href={`/venues/${night.venueSlug}`}
                            className="hover:text-[#00F0FF]"
                          >
                            {night.venueName}
                          </Link>
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A0A3BD]">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#FF2E93]" />
                            {night.neighborhood} •{" "}
                            {night.address || (
                              <span className="italic text-[#FFB800]">
                                Address Pending Verification (List-only · no pin)
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

                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono-code rounded-lg border border-white/10 bg-[#0B0B14] px-2 py-0.5 text-[11px] font-semibold text-[#00F0FF]">
                          {night.roomCode}
                        </span>
                        {night.hostSlug ? (
                          <Link
                            href={`/hosts/${night.hostSlug}`}
                            className="text-[11px] font-semibold text-[#FF2E93] hover:underline"
                          >
                            {night.hostOrKj}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-[#A0A3BD]">
                            {night.hostOrKj === "UNKNOWN"
                              ? "KJ Pending"
                              : night.hostOrKj}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Genre-Fit Differentiator Block */}
                    <div className="mt-3 rounded-xl border border-white/10 bg-[#151525] p-3 text-xs">
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

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px] text-[#A0A3BD]">
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
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/nights/${night.slug}`}
                          className="rounded-lg bg-[#151525] px-2.5 py-1.5 font-semibold text-[#F8F9FA] hover:bg-white/10"
                        >
                          Night Page
                        </Link>
                        <Link
                          href={`/venues/${night.venueSlug}`}
                          className="rounded-lg bg-[#151525] px-2.5 py-1.5 font-semibold text-[#F8F9FA] hover:bg-white/10"
                        >
                          Venue Detail
                        </Link>
                        <Link
                          href={`/room/${night.roomCode}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#FF2E93]/40 bg-[#FF2E93]/15 px-2.5 py-1.5 font-bold text-[#FF2E93] hover:bg-[#FF2E93]/25"
                        >
                          <Radio className="h-3 w-3" />
                          <span>Live Room</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCorrectionTarget({
                              nightId: night.id,
                              venueName: night.venueName,
                              defaultField: isUnknownGenre
                                ? "primaryGenre"
                                : "startTime",
                            });
                          }}
                          className="rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-2.5 py-1.5 font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/20"
                          data-testid="open-correction-modal-btn"
                        >
                          Submit an Update
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClaimTarget({
                              targetType: "night",
                              targetId: night.id,
                              targetName: `${night.venueName} (${night.dayOfWeek})`,
                            });
                          }}
                          className="rounded-lg border border-white/15 bg-[#151525] px-2.5 py-1.5 font-semibold text-[#A0A3BD] hover:text-white"
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
        </section>
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
