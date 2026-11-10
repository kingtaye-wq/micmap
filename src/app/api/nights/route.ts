import { NextRequest, NextResponse } from "next/server";
import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import {
  getClevelandCalendarDate,
  matchesDayFilter,
  matchesGenreFilter,
  parseClevelandDateInput,
  resolveTargetDateForDaySelection,
} from "@/lib/csv-parser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await syncStoreFromSupabase();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const rawDayParam = searchParams.get("day");
  const day = rawDayParam
    ? rawDayParam.toLowerCase() === "all"
      ? "ALL"
      : rawDayParam
    : dateParam
    ? "Tonight"
    : "ALL";
  const type = searchParams.get("type") || "ALL";
  const genre = searchParams.get("genre") || "ALL";
  const neighborhood = searchParams.get("neighborhood") || "ALL";
  const format = searchParams.get("format") || "ALL";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const referenceDate = dateParam
    ? parseClevelandDateInput(dateParam)
    : new Date();

  const publicNights = getPublicVerifiedNights();

  const filtered = publicNights.filter((night) => {
    if (day !== "ALL" && !matchesDayFilter(night, day, referenceDate)) {
      return false;
    }
    if (type !== "ALL" && type.toLowerCase() !== "all") {
      const normalizedType = type.toLowerCase().replace(/\s+/g, "_");
      if (night.nightType !== normalizedType) return false;
    }
    if (format !== "ALL" && format.toLowerCase() !== "all" && night.formatType !== format) {
      return false;
    }
    if (
      neighborhood !== "ALL" &&
      neighborhood.toLowerCase() !== "all" &&
      !night.neighborhood.toLowerCase().includes(neighborhood.toLowerCase())
    ) {
      return false;
    }
    if (genre !== "ALL" && genre.toLowerCase() !== "all") {
      const fit = matchesGenreFilter(night, genre);
      if (!fit.matches) return false;
    }
    if (q) {
      const hay = `${night.venueName} ${night.neighborhood} ${night.hostOrKj} ${night.primaryGenre} ${night.alsoWelcome}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const targetCal =
    day !== "ALL"
      ? getClevelandCalendarDate(
          resolveTargetDateForDaySelection(day, referenceDate)
        )
      : null;

  return NextResponse.json({
    totalPublicVerifiedCount: publicNights.length,
    filteredCount: filtered.length,
    filtersApplied: {
      day,
      date: targetCal ? targetCal.isoDate : null,
      weekday: targetCal ? targetCal.weekday : null,
      nthWeekdayOfMonth: targetCal ? targetCal.nthWeekdayOfMonth : null,
      isLastWeekdayOfMonth: targetCal ? targetCal.isLastWeekdayOfMonth : null,
      type,
      genre,
      neighborhood,
      format,
      q,
    },
    nights: filtered,
  });
}
