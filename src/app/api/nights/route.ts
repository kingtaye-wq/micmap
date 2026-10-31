import { NextRequest, NextResponse } from "next/server";
import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { matchesDayFilter, matchesGenreFilter } from "@/lib/csv-parser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await syncStoreFromSupabase();
  const { searchParams } = new URL(request.url);
  const day = searchParams.get("day") || "ALL";
  const type = searchParams.get("type") || "ALL";
  const genre = searchParams.get("genre") || "ALL";
  const neighborhood = searchParams.get("neighborhood") || "ALL";
  const format = searchParams.get("format") || "ALL";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const publicNights = getPublicVerifiedNights();

  const filtered = publicNights.filter((night) => {
    if (day !== "ALL" && !matchesDayFilter(night, day)) {
      return false;
    }
    if (type !== "ALL") {
      const normalizedType = type.toLowerCase().replace(/\s+/g, "_");
      if (night.nightType !== normalizedType) return false;
    }
    if (format !== "ALL" && night.formatType !== format) {
      return false;
    }
    if (
      neighborhood !== "ALL" &&
      !night.neighborhood.toLowerCase().includes(neighborhood.toLowerCase())
    ) {
      return false;
    }
    if (genre !== "ALL") {
      const fit = matchesGenreFilter(night, genre);
      if (!fit.matches) return false;
    }
    if (q) {
      const hay = `${night.venueName} ${night.neighborhood} ${night.hostOrKj} ${night.primaryGenre} ${night.alsoWelcome}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json({
    totalPublicVerifiedCount: publicNights.length,
    filteredCount: filtered.length,
    filtersApplied: { day, type, genre, neighborhood, format, q },
    nights: filtered,
  });
}
