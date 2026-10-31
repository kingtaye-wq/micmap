import fs from "fs";
import path from "path";
import { loadClevelandSeedFromCsv } from "../src/lib/csv-parser";
import { APP_NAME, APP_DOMAIN, DEFAULT_METRO } from "../src/config/brand";

function main() {
  const { rawRows, nights, venues, hosts } = loadClevelandSeedFromCsv();

  const verifiedNights = nights.filter((n) => n.confidence === "verified");
  const needsVerificationNights = nights.filter(
    (n) => n.confidence === "needs_verification"
  );
  const karaokeNights = nights.filter((n) => n.nightType === "karaoke");
  const openMicNights = nights.filter((n) => n.nightType === "open_mic");
  const missingDayRows = nights.filter((n) => n.dayOfWeek === "UNKNOWN");
  const missingStartTimeRows = nights.filter((n) => n.startTime === "UNKNOWN");
  const sourcedPrimaryGenreRows = nights.filter(
    (n) => n.primaryGenre !== "UNKNOWN"
  );
  const unknownNotAFitRows = nights.filter((n) => n.notAFit === "UNKNOWN");
  const geocodeFailures = nights
    .filter((n) => n.geocodeStatus !== "geocoded")
    .map((n) => ({
      csvRowNumber: n.csvRowNumber,
      venueName: n.venueName,
      neighborhood: n.neighborhood,
      confidence: n.confidence,
      reason:
        n.geocodeStatus === "missing_address"
          ? "Address column is blank in cleveland-venues-master.csv; coordinates left null (never invented)."
          : "Address failed geocoding lookup; coordinates left null.",
    }));

  const spotChecks = nights.slice(0, 10).map((n) => ({
    csvRowNumber: n.csvRowNumber,
    venueName: n.venueName,
    dayOfWeek: n.dayOfWeek,
    startTime: n.startTime,
    nightType: n.nightTypeLabel,
    hostOrKj: n.hostOrKj,
    primaryGenre: n.primaryGenre,
    alsoWelcome: n.alsoWelcome,
    notAFit: n.notAFit,
    confidence: n.confidence,
    sourceUrl: n.sourceUrl,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    appName: APP_NAME,
    appDomain: APP_DOMAIN,
    metro: DEFAULT_METRO,
    sourceFile: "data/cleveland-venues-master.csv",
    counts: {
      totalCsvRows: rawRows.length,
      verifiedPublicNights: verifiedNights.length,
      needsVerificationAdminQueueRows: needsVerificationNights.length,
      karaokeRows: karaokeNights.length,
      openMicRows: openMicNights.length,
      canonicalUniqueVenues: venues.length,
      canonicalUniqueHostsKjs: hosts.length,
      rowsWithAddressGeocoded: nights.length - geocodeFailures.length,
      rowsMissingAddressFlagged: geocodeFailures.length,
      rowsMissingDayOfWeekPreserved: missingDayRows.length,
      rowsMissingStartTimePreserved: missingStartTimeRows.length,
      rowsWithSourcedPrimaryGenre: sourcedPrimaryGenreRows.length,
      rowsWithUnknownNotAFit: unknownNotAFitRows.length,
    },
    geocodeFailures,
    spotChecksFirst10: spotChecks,
  };

  const outPath = path.join(
    process.cwd(),
    "data",
    "seed-reconciliation-report.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("==========================================================");
  console.log(`${APP_NAME} (${APP_DOMAIN}) — Cleveland Seed Reconciliation`);
  console.log("==========================================================");
  console.table(report.counts);
  console.log("\nFlagged Geocode Rows (Coordinates preserved as null):");
  console.table(report.geocodeFailures);
  console.log(`\nSaved full report to ${outPath}`);
}

main();
