import { NextRequest, NextResponse } from "next/server";
import {
  getAdminVerificationQueue,
  getPublicVerifiedNights,
  importIntakeCsvToQueue,
  syncStoreFromSupabase,
} from "@/lib/store";

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
 * Admin CSV Update-Intake Endpoint (Amendment 2B)
 * Accepts CSV rows in cleveland-venues-master.csv column format + source + intakeDate.
 * Every imported row lands strictly in confidence = "needs_verification" on /admin/verification-queue
 * (never straight to public), stamped with source + date so an admin can review & Verify & Publish.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const csvContent = String(body.csvContent || "").trim();
  const source = String(body.source || "Admin CSV Intake Upload").trim();
  const intakeDate = String(
    body.intakeDate || new Date().toISOString().slice(0, 10)
  ).trim();

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
