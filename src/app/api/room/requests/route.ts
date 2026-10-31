import { NextRequest, NextResponse } from "next/server";
import {
  recordTipPayment,
  sanitizePublicText,
  syncStoreFromSupabase,
  persistStoreToSupabase,
} from "@/lib/store";
import { calculateTipBreakdown } from "@/config/brand";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get("roomCode");
  const store = await syncStoreFromSupabase();

  const requests = roomCode
    ? store.songRequests.filter(
        (r) => r.roomCode.toUpperCase() === roomCode.toUpperCase()
      )
    : store.songRequests;

  return NextResponse.json({
    songRequests: requests,
    tips: store.tips,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await syncStoreFromSupabase();

  const roomCode = String(body.roomCode || "CLE-018").toUpperCase();
  const night =
    store.nights.find((n) => n.roomCode.toUpperCase() === roomCode) ||
    store.nights.find((n) => n.id === "night-18");

  const tipBoostCents = Math.max(0, Number(body.tipBoostCents || 0));
  const tipBreakdown = calculateTipBreakdown(tipBoostCents);

  const newRequest = {
    id: `sr-${Date.now()}`,
    roomCode,
    nightId: night?.id || "night-18",
    venueName: night?.venueName || String(body.venueName || "Time Warp Bar"),
    singerStageName: sanitizePublicText(
      String(body.singerStageName || "Guest Singer")
    ),
    songTitle: sanitizePublicText(String(body.songTitle || "")),
    artistName: sanitizePublicText(String(body.artistName || "")),
    notesKeyChange: sanitizePublicText(
      String(body.notesKeyChange || "Standard key")
    ),
    tipBoostCents: tipBreakdown.grossCents,
    platformFeeCents: tipBreakdown.platformFeeCents,
    netKjCents: tipBreakdown.netKjCents,
    notifyContact: String(body.notifyContact || ""),
    status: "queued" as const,
    createdAt: new Date().toISOString(),
  };

  store.songRequests.push(newRequest);

  let tipResult = null;
  if (tipBoostCents > 0) {
    tipResult = recordTipPayment({
      recipientType: "kj",
      recipientSlug:
        night?.hostSlug || "shell-yeah-events-by-meshell",
      recipientName:
        night?.hostOrKj && night.hostOrKj !== "UNKNOWN"
          ? night.hostOrKj
          : "KJ Meshell (Shell Yeah Events by MeShell)",
      roomCode,
      tipperName: newRequest.singerStageName,
      grossCents: tipBoostCents,
    });
  }

  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    songRequest: newRequest,
    tipBreakdown,
    tipResult,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { requestId, status } = body;
  const store = await syncStoreFromSupabase();

  const reqItem = store.songRequests.find((r) => r.id === requestId);
  if (!reqItem) {
    return NextResponse.json(
      { error: "Song request not found" },
      { status: 404 }
    );
  }

  reqItem.status = status;
  await persistStoreToSupabase(store);
  return NextResponse.json({
    ok: true,
    songRequest: reqItem,
  });
}
