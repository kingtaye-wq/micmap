import { NextRequest, NextResponse } from "next/server";
import {
  sanitizePublicText,
  syncStoreFromSupabase,
  persistStoreToSupabase,
  upsertNightsToSupabase,
} from "@/lib/store";
import { computeFreshness } from "@/lib/csv-parser";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await syncStoreFromSupabase();
  return NextResponse.json({
    corrections: store.corrections,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await syncStoreFromSupabase();

  const correction = {
    id: `corr-${Date.now()}`,
    nightId: String(body.nightId || ""),
    venueName: sanitizePublicText(String(body.venueName || "")),
    fieldName: (body.fieldName || "primaryGenre") as
      | "primaryGenre"
      | "alsoWelcome"
      | "notAFit"
      | "startTime"
      | "dayOfWeek"
      | "hostOrKj"
      | "signupMethod",
    proposedValue: sanitizePublicText(String(body.proposedValue || "")),
    sourceOrBasis: sanitizePublicText(String(body.sourceOrBasis || "")),
    submitterRole: (body.submitterRole || "crowd_report") as
      | "venue"
      | "kj"
      | "crowd_report",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  store.corrections.unshift(correction);
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    message:
      "Update submitted to the moderation queue. Public data updates once verified.",
    correction,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { correctionId, decision } = body;
  const store = await syncStoreFromSupabase();

  const corr = store.corrections.find((c) => c.id === correctionId);
  if (!corr) {
    return NextResponse.json(
      { error: "Correction not found" },
      { status: 404 }
    );
  }

  corr.status = decision === "approved" ? "approved" : "rejected";

  let updatedNight = null;
  if (corr.status === "approved") {
    const night = store.nights.find(
      (n) => n.id === corr.nightId || n.slug === corr.nightId
    );
    if (night) {
      if (corr.fieldName === "primaryGenre") {
        night.primaryGenre = corr.proposedValue;
      } else if (corr.fieldName === "alsoWelcome") {
        night.alsoWelcome = corr.proposedValue;
      } else if (corr.fieldName === "notAFit") {
        night.notAFit = corr.proposedValue;
      } else if (corr.fieldName === "startTime") {
        night.startTime = corr.proposedValue;
      } else if (corr.fieldName === "dayOfWeek") {
        night.dayOfWeek = corr.proposedValue;
      } else if (corr.fieldName === "hostOrKj") {
        night.hostOrKj = corr.proposedValue;
      } else if (corr.fieldName === "signupMethod") {
        night.signupMethod = corr.proposedValue;
      }

      night.genreVibeTags =
        night.primaryGenre !== "UNKNOWN" && night.alsoWelcome !== "UNKNOWN"
          ? `${night.primaryGenre} • Also welcome: ${night.alsoWelcome}`
          : night.primaryGenre !== "UNKNOWN"
          ? night.primaryGenre
          : night.alsoWelcome !== "UNKNOWN"
          ? `Also welcome: ${night.alsoWelcome}`
          : "UNKNOWN";

      night.assertedBy = corr.submitterRole;
      night.genreBasis = `${corr.sourceOrBasis} (Reported by ${corr.submitterRole})`;
      const nowIso = new Date("2026-10-31T12:00:00Z").toISOString();
      night.lastVerifiedAt = nowIso;
      night.lastConfirmedText = "Verified community update 2026-10-31";
      const { daysSinceConfirmed, freshnessStatus } = computeFreshness(nowIso);
      night.daysSinceConfirmed = daysSinceConfirmed;
      night.freshnessStatus = freshnessStatus;
      updatedNight = night;
      await upsertNightsToSupabase([night]);
    }
  }

  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    correction: corr,
    updatedNight,
  });
}
