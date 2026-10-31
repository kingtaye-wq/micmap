import { NextRequest, NextResponse } from "next/server";
import { getStore, sanitizePublicText } from "@/lib/store";
import { computeFreshness } from "@/lib/csv-parser";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    claims: store.claims,
  });
}

/**
 * Submitting a claim creates a PENDING claim in the admin review queue ONLY.
 * Per mvp-build-packet.md §5 & §8.3:
 * "Submitting a claim changes nothing publicly; approving it in admin updates the page and stamps last_confirmed."
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = getStore();

  const newClaim = {
    id: `claim-${Date.now()}`,
    targetType: (body.targetType || "venue") as "venue" | "night" | "person",
    targetId: String(body.targetId || ""),
    targetName: sanitizePublicText(String(body.targetName || "")),
    claimantName: sanitizePublicText(String(body.claimantName || "")),
    claimantEmail: String(body.claimantEmail || ""),
    claimantRole: String(body.claimantRole || "Venue Owner / KJ"),
    socialOrWebProof: String(body.socialOrWebProof || ""),
    assertedPrimaryGenre: sanitizePublicText(
      String(body.assertedPrimaryGenre || "UNKNOWN")
    ),
    assertedAlsoWelcome: sanitizePublicText(
      String(body.assertedAlsoWelcome || "UNKNOWN")
    ),
    assertedNotAFit: sanitizePublicText(
      String(body.assertedNotAFit || "UNKNOWN")
    ),
    scheduleNotes: sanitizePublicText(String(body.scheduleNotes || "")),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  store.claims.unshift(newClaim);

  store.notificationEvents.unshift({
    id: `notif-${Date.now()}`,
    tenantId: "00000000-0000-4000-8000-000000000001",
    eventType: "claim_submitted",
    channel: "email",
    recipient: newClaim.claimantEmail,
    subject: `Claim received for ${newClaim.targetName} (Pending Admin Review)`,
    smsSegments: 0,
    ghlSyncStatus: "queued_internal",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message:
      "Claim queued for admin verification. Public listing remains unchanged until approved.",
    claim: newClaim,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { claimId, decision } = body;
  const store = getStore();

  const claim = store.claims.find((c) => c.id === claimId);
  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  claim.status = decision === "approved" ? "approved" : "rejected";
  claim.reviewedAt = new Date().toISOString();

  let updatedNight = null;

  if (claim.status === "approved") {
    const nowIso = new Date("2026-10-31T12:00:00Z").toISOString();
    // Find matching night by id or venueSlug
    const matchingNights = store.nights.filter(
      (n) =>
        n.id === claim.targetId ||
        n.slug === claim.targetId ||
        n.venueSlug === claim.targetId ||
        n.venueId === claim.targetId
    );

    matchingNights.forEach((night) => {
      if (
        claim.assertedPrimaryGenre &&
        claim.assertedPrimaryGenre !== "UNKNOWN"
      ) {
        night.primaryGenre = claim.assertedPrimaryGenre;
      }
      if (
        claim.assertedAlsoWelcome &&
        claim.assertedAlsoWelcome !== "UNKNOWN"
      ) {
        night.alsoWelcome = claim.assertedAlsoWelcome;
      }
      if (claim.assertedNotAFit && claim.assertedNotAFit !== "UNKNOWN") {
        night.notAFit = claim.assertedNotAFit;
      }
      night.genreVibeTags =
        night.primaryGenre !== "UNKNOWN" && night.alsoWelcome !== "UNKNOWN"
          ? `${night.primaryGenre} • Also welcome: ${night.alsoWelcome}`
          : night.primaryGenre !== "UNKNOWN"
          ? night.primaryGenre
          : night.alsoWelcome !== "UNKNOWN"
          ? `Also welcome: ${night.alsoWelcome}`
          : "UNKNOWN";
      night.assertedBy = claim.claimantRole.toLowerCase().includes("kj")
        ? "kj"
        : "venue";
      night.genreBasis = `Verified claim assertion by ${claim.claimantName} (${claim.claimantRole})`;
      night.lastVerifiedAt = nowIso;
      night.lastConfirmedText = `Claim approved & confirmed 2026-10-31 by ${claim.claimantName}`;
      const { daysSinceConfirmed, freshnessStatus } = computeFreshness(nowIso);
      night.daysSinceConfirmed = daysSinceConfirmed;
      night.freshnessStatus = freshnessStatus;
      updatedNight = night;
    });
  }

  return NextResponse.json({
    ok: true,
    claim,
    updatedNight,
  });
}
