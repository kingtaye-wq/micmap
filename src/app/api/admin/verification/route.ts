import { NextRequest, NextResponse } from "next/server";
import {
  getAdminVerificationQueue,
  getPublicVerifiedNights,
  getStore,
  verifyAndPublishNight,
  setNightDaysAgoConfirmed,
  resetStore,
} from "@/lib/store";

export async function GET() {
  const store = getStore();
  const verificationQueue = getAdminVerificationQueue();
  const publicVerified = getPublicVerifiedNights();
  const staleWarning = store.nights.filter(
    (n) =>
      n.confidence === "verified" && n.freshnessStatus === "call_to_confirm"
  );
  const expired90d = store.nights.filter(
    (n) => n.freshnessStatus === "expired_90d"
  );

  return NextResponse.json({
    counts: {
      totalSeededRows: store.nights.length,
      publicVerifiedCount: publicVerified.length,
      needsVerificationCount: verificationQueue.length,
      stale45to89Count: staleWarning.length,
      expired90dCount: expired90d.length,
    },
    verificationQueue,
    staleWarning,
    expired90d,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, nightId, daysAgo } = body;

  if (action === "reset_store") {
    resetStore();
    return NextResponse.json({ ok: true, action: "reset_store" });
  }

  if (action === "verify_and_publish") {
    const promoted = verifyAndPublishNight(nightId);
    if (!promoted) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      promotedNight: promoted,
      publicVerifiedCount: getPublicVerifiedNights().length,
      needsVerificationCount: getAdminVerificationQueue().length,
    });
  }

  if (action === "archive") {
    const store = getStore();
    const night = store.nights.find((n) => n.id === nightId);
    if (!night) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    night.confidence = "archived";
    return NextResponse.json({
      ok: true,
      archivedNight: night,
      publicVerifiedCount: getPublicVerifiedNights().length,
      needsVerificationCount: getAdminVerificationQueue().length,
    });
  }

  if (action === "set_freshness_days") {
    const updated = setNightDaysAgoConfirmed(nightId, Number(daysAgo));
    if (!updated) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      updatedNight: updated,
      publicVerifiedCount: getPublicVerifiedNights().length,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
