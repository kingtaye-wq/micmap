import { NextRequest, NextResponse } from "next/server";
import {
  getAdminVerificationQueue,
  getPublicVerifiedNights,
  verifyAndPublishNight,
  setNightDaysAgoConfirmed,
  setNightPosterAsSourceStatus,
  resetStoreLive,
  syncStoreFromSupabase,
  persistStoreToSupabase,
  upsertNightsToSupabase,
} from "@/lib/store";
import { PosterAsSourceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await syncStoreFromSupabase();
  const verificationQueue = getAdminVerificationQueue();
  const publicVerified = getPublicVerifiedNights();
  const staleWarning = store.nights.filter(
    (n) =>
      n.confidence === "verified" && n.freshnessStatus === "call_to_confirm"
  );
  const expired90d = store.nights.filter(
    (n) => n.freshnessStatus === "expired_90d"
  );
  const askThePosterCount = store.nights.filter(
    (n) =>
      n.posterAsSourceStatus === "ask_the_poster" ||
      n.posterAsSourceStatus === "draft_outreach_ready"
  ).length;

  return NextResponse.json({
    counts: {
      totalSeededRows: store.nights.length,
      publicVerifiedCount: publicVerified.length,
      needsVerificationCount: verificationQueue.length,
      stale45to89Count: staleWarning.length,
      expired90dCount: expired90d.length,
      askThePosterCount,
    },
    verificationQueue,
    staleWarning,
    expired90d,
    intakeBatches: store.intakeBatches || [],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, nightId, daysAgo } = body;

  if (action === "reset_store") {
    await resetStoreLive();
    return NextResponse.json({ ok: true, action: "reset_store" });
  }

  const store = await syncStoreFromSupabase();

  if (action === "verify_and_publish") {
    const promoted = verifyAndPublishNight(nightId);
    if (!promoted) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    await persistStoreToSupabase(store);
    await upsertNightsToSupabase([promoted]);
    return NextResponse.json({
      ok: true,
      promotedNight: promoted,
      publicVerifiedCount: getPublicVerifiedNights().length,
      needsVerificationCount: getAdminVerificationQueue().length,
    });
  }

  if (action === "set_poster_as_source") {
    const status = (body.status || "ask_the_poster") as PosterAsSourceStatus;
    const outreachDraft =
      typeof body.outreachDraft === "string" ? body.outreachDraft : undefined;
    const updated = setNightPosterAsSourceStatus({
      nightId,
      status,
      outreachDraft,
    });
    if (!updated) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    await persistStoreToSupabase(store);
    await upsertNightsToSupabase([updated]);
    return NextResponse.json({
      ok: true,
      updatedNight: updated,
      publicVerifiedCount: getPublicVerifiedNights().length,
      needsVerificationCount: getAdminVerificationQueue().length,
    });
  }

  if (action === "archive") {
    const night = store.nights.find((n) => n.id === nightId);
    if (!night) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    night.confidence = "archived";
    await persistStoreToSupabase(store);
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
    await persistStoreToSupabase(store);
    await upsertNightsToSupabase([updated]);
    return NextResponse.json({
      ok: true,
      updatedNight: updated,
      publicVerifiedCount: getPublicVerifiedNights().length,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
