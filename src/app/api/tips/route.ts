import { NextRequest, NextResponse } from "next/server";
import {
  recordTipPayment,
  syncStoreFromSupabase,
  persistStoreToSupabase,
} from "@/lib/store";
import {
  calculateTipBreakdown,
  evaluatePayoutStatus,
  KJ_PAYOUT_MINIMUM_CENTS,
  TIP_PLATFORM_FEE_BPS,
} from "@/config/brand";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipientSlug = searchParams.get("recipientSlug");
  const store = await syncStoreFromSupabase();

  const tips = recipientSlug
    ? store.tips.filter((t) => t.recipientSlug === recipientSlug)
    : store.tips;

  const grossTotalCents = tips.reduce((acc, t) => acc + t.grossCents, 0);
  const feeTotalCents = tips.reduce((acc, t) => acc + t.platformFeeCents, 0);
  const netTotalCents = tips.reduce((acc, t) => acc + t.netKjCents, 0);
  const payoutEvaluation = evaluatePayoutStatus(netTotalCents);

  return NextResponse.json({
    platformFeeBps: TIP_PLATFORM_FEE_BPS,
    payoutMinimumCents: KJ_PAYOUT_MINIMUM_CENTS,
    summary: {
      grossTotalCents,
      feeTotalCents,
      netTotalCents,
      payoutEvaluation,
    },
    tips,
  });
}

/**
 * Server-side only Stripe Connect Test Mode Tip Checkout handler.
 * Secrets (STRIPE_SECRET_KEY) never reach the client.
 * Calculates exact 5% platform fee ($0.50 on a $10.00 tip) and queues payout only at >= $25.00.
 */
export async function POST(request: NextRequest) {
  const store = await syncStoreFromSupabase();
  const body = await request.json();
  const grossCents = Number(body.grossCents || 1000);
  const recipientSlug = String(
    body.recipientSlug || "shell-yeah-events-by-meshell"
  );
  const recipientName = String(
    body.recipientName || "KJ Meshell (Shell Yeah Events by MeShell)"
  );
  const roomCode = String(body.roomCode || "CLE-018");
  const tipperName = String(body.tipperName || "Cleveland Fan");

  const breakdown = calculateTipBreakdown(grossCents);
  const result = recordTipPayment({
    recipientType: body.recipientType || "kj",
    recipientSlug,
    recipientName,
    roomCode,
    tipperName,
    grossCents,
  });
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    mode: "stripe_connect_test_mode",
    breakdown,
    tip: result.tip,
    hostBalanceCents: result.hostBalanceCents,
    payoutEvaluation: result.payoutEvaluation,
  });
}
