import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  backfillProvenanceFromCsv,
  getAdminVerificationQueue,
  getPublicVerifiedNights,
  importIntakeCsvToQueue,
  syncStoreFromSupabase,
} from "@/lib/store";
import { PosterAsSourceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await syncStoreFromSupabase();
  return NextResponse.json({
    intakeBatches: store.intakeBatches || [],
    needsVerificationCount: getAdminVerificationQueue().length,
    publicVerifiedCount: getPublicVerifiedNights().length,
  });
}

/**
 * Admin CSV Update-Intake & Source Provenance Backfill Endpoint (Amendments 2B & 4)
 * - Accepts CSV rows in cleveland-venues-master.csv column format + source + intakeDate + OS-internal provenance fields.
 * - Every imported row lands strictly in confidence = "needs_verification" on /admin/verification-queue
 *   (never straight to public), stamped with source + date + full provenance.
 * - Also accepts action = "backfill_provenance" with provenanceCsvContent (or defaults to research/source-provenance.csv).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "backfill_provenance") {
    let provText = String(body.provenanceCsvContent || "").trim();
    if (!provText) {
      const defaultPath = path.join(
        process.cwd(),
        "research",
        "source-provenance.csv"
      );
      if (fs.existsSync(defaultPath)) {
        provText = fs.readFileSync(defaultPath, "utf8");
      }
    }
    if (!provText) {
      return NextResponse.json(
        { error: "Provenance CSV content is required for backfill." },
        { status: 400 }
      );
    }
    const result = await backfillProvenanceFromCsv(provText);
    return NextResponse.json({
      ok: true,
      action: "backfill_provenance",
      ...result,
      publicVerifiedCount: getPublicVerifiedNights().length,
      needsVerificationCount: getAdminVerificationQueue().length,
    });
  }

  const csvContent = String(body.csvContent || "").trim();
  const source = String(body.source || "Admin CSV Intake Upload").trim();
  const intakeDate = String(
    body.intakeDate || new Date().toISOString().slice(0, 10)
  ).trim();
  const sourcePlatform = body.sourcePlatform
    ? String(body.sourcePlatform).trim()
    : undefined;
  const sourceContext = body.sourceContext
    ? String(body.sourceContext).trim()
    : undefined;
  const posterName = body.posterName
    ? String(body.posterName).trim()
    : undefined;
  const posterProfileUrl = body.posterProfileUrl
    ? String(body.posterProfileUrl).trim()
    : undefined;
  const sourceContactInfo = body.sourceContactInfo
    ? String(body.sourceContactInfo).trim()
    : undefined;
  const capturedDate = body.capturedDate
    ? String(body.capturedDate).trim()
    : intakeDate;
  const posterAsSourceStatus = (body.posterAsSourceStatus ||
    "none") as PosterAsSourceStatus;
  const posterOutreachDraft = body.posterOutreachDraft
    ? String(body.posterOutreachDraft).trim()
    : undefined;

  if (!csvContent) {
    return NextResponse.json(
      { error: "CSV content is required for update-intake import." },
      { status: 400 }
    );
  }

  const { importedNights, batch } = await importIntakeCsvToQueue({
    csvContent,
    source,
    intakeDate,
    sourcePlatform,
    sourceContext,
    posterName,
    posterProfileUrl,
    sourceContactInfo,
    capturedDate,
    posterAsSourceStatus,
    posterOutreachDraft,
  });

  if (importedNights.length === 0) {
    return NextResponse.json(
      { error: "No valid venue-night rows found in CSV input." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    batch,
    importedCount: importedNights.length,
    importedNights,
    publicVerifiedCount: getPublicVerifiedNights().length,
    needsVerificationCount: getAdminVerificationQueue().length,
  });
}
