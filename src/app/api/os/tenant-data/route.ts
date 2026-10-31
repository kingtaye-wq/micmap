import { NextRequest, NextResponse } from "next/server";
import {
  TEST_ACCOUNTS,
  sanitizePublicText,
  syncStoreFromSupabase,
  persistStoreToSupabase,
  upsertNightsToSupabase,
} from "@/lib/store";
import { computeFreshness } from "@/lib/csv-parser";

export const dynamic = "force-dynamic";

/**
 * Tenant-Isolated Mic Map OS API (mvp-build-packet.md §6 & §8.4)
 * Enforces Row Level Security (RLS) semantics at the API layer:
 * A logged-in KJ can ONLY view or edit rows tied to their own tenant_id.
 * Any attempt by KJ A to read or mutate KJ B's tenant_id returns HTTP 403 Forbidden.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const actorEmail =
    request.headers.get("x-user-email") ||
    searchParams.get("actorEmail") ||
    "meshell@shellyeahevents.com";
  const requestedTenantId =
    request.headers.get("x-target-tenant-id") ||
    searchParams.get("targetTenantId");

  const actor = TEST_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === actorEmail.toLowerCase()
  );
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid Mic Map OS session" },
      { status: 401 }
    );
  }

  // Enforce RLS tenant boundary: non-admin users cannot access another tenant's data
  const effectiveTenantId = requestedTenantId || actor.tenantId;
  if (actor.role !== "admin" && effectiveTenantId !== actor.tenantId) {
    return NextResponse.json(
      {
        error:
          "RLS_TENANT_ISOLATION_VIOLATION: Access denied. You cannot read another KJ/venue tenant's followers, tips, or nights.",
        actorTenantId: actor.tenantId,
        requestedTenantId: effectiveTenantId,
      },
      { status: 403 }
    );
  }

  const store = await syncStoreFromSupabase();
  const hostProfile = store.hosts.find((h) => h.tenantId === effectiveTenantId);
  const nights = store.nights.filter((n) => n.tenantId === effectiveTenantId);
  const follows = store.follows.filter((f) => f.tenantId === effectiveTenantId);
  const tips = store.tips.filter((t) => t.tenantId === effectiveTenantId);
  const notifications = store.notificationEvents.filter(
    (e) => e.tenantId === effectiveTenantId
  );

  return NextResponse.json({
    actor,
    tenantId: effectiveTenantId,
    hostProfile: hostProfile || null,
    nights,
    follows,
    tips,
    notifications,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const actorEmail =
    request.headers.get("x-user-email") ||
    body.actorEmail ||
    "meshell@shellyeahevents.com";
  const targetTenantId = body.targetTenantId;

  const actor = TEST_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === String(actorEmail).toLowerCase()
  );
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid Mic Map OS session" },
      { status: 401 }
    );
  }

  if (actor.role !== "admin" && targetTenantId && targetTenantId !== actor.tenantId) {
    return NextResponse.json(
      {
        error:
          "RLS_TENANT_ISOLATION_VIOLATION: Cannot edit another tenant's profile, nights, or followers.",
        actorTenantId: actor.tenantId,
        targetTenantId,
      },
      { status: 403 }
    );
  }

  const store = await syncStoreFromSupabase();
  const effectiveTenantId = targetTenantId || actor.tenantId;
  const host = store.hosts.find((h) => h.tenantId === effectiveTenantId);

  if (body.action === "update_host_profile" && host) {
    if (body.bio !== undefined) host.bio = sanitizePublicText(String(body.bio));
    if (Array.isArray(body.genresSupported)) {
      host.genresSupported = body.genresSupported.map((g: string) =>
        sanitizePublicText(String(g))
      );
    }
    await persistStoreToSupabase(store);
    return NextResponse.json({ ok: true, hostProfile: host });
  }

  if (body.action === "update_own_night") {
    const night = store.nights.find((n) => n.id === body.nightId);
    if (!night) {
      return NextResponse.json({ error: "Night not found" }, { status: 404 });
    }
    if (actor.role !== "admin" && night.tenantId !== actor.tenantId) {
      return NextResponse.json(
        {
          error:
            "RLS_TENANT_ISOLATION_VIOLATION: Cannot edit a night belonging to another tenant.",
        },
        { status: 403 }
      );
    }

    if (body.startTime) night.startTime = sanitizePublicText(body.startTime);
    if (body.primaryGenre)
      night.primaryGenre = sanitizePublicText(body.primaryGenre);
    if (body.alsoWelcome)
      night.alsoWelcome = sanitizePublicText(body.alsoWelcome);
    if (body.notAFit) night.notAFit = sanitizePublicText(body.notAFit);

    night.genreVibeTags =
      night.primaryGenre !== "UNKNOWN" && night.alsoWelcome !== "UNKNOWN"
        ? `${night.primaryGenre} • Also welcome: ${night.alsoWelcome}`
        : night.primaryGenre !== "UNKNOWN"
        ? night.primaryGenre
        : night.alsoWelcome !== "UNKNOWN"
        ? `Also welcome: ${night.alsoWelcome}`
        : "UNKNOWN";

    // Edits to schedule/genre go live instantly on their own page and update last_confirmed
    const nowIso = new Date("2026-10-31T12:00:00Z").toISOString();
    night.lastVerifiedAt = nowIso;
    night.lastConfirmedText = `Updated live by ${actor.displayName} on 2026-10-31`;
    const { daysSinceConfirmed, freshnessStatus } = computeFreshness(nowIso);
    night.daysSinceConfirmed = daysSinceConfirmed;
    night.freshnessStatus = freshnessStatus;

    await persistStoreToSupabase(store);
    await upsertNightsToSupabase([night]);
    return NextResponse.json({ ok: true, night });
  }

  if (body.action === "send_follower_alert" && host) {
    const activeFollowers = store.follows.filter(
      (f) => f.tenantId === effectiveTenantId && !f.stopped
    );
    const smsCount = activeFollowers.filter((f) => f.smsOptIn).length;
    host.smsSegmentsUsed = Math.min(
      host.smsSegmentsCap,
      host.smsSegmentsUsed + smsCount
    );

    const event = {
      id: `notif-${Date.now()}`,
      tenantId: effectiveTenantId,
      eventType: "tonight_alert" as const,
      channel: (body.channel === "sms" ? "sms" : "email") as "email" | "sms",
      recipient: `${activeFollowers.length} opted-in followers`,
      subject: sanitizePublicText(
        String(body.message || `${host.displayName} is live tonight!`)
      ),
      smsSegments: body.channel === "sms" ? smsCount : 0,
      ghlSyncStatus: "queued_internal" as const,
      createdAt: new Date().toISOString(),
    };
    store.notificationEvents.unshift(event);
    await persistStoreToSupabase(store);
    return NextResponse.json({
      ok: true,
      notificationEvent: event,
      smsSegmentsUsed: host.smsSegmentsUsed,
      smsSegmentsCap: host.smsSegmentsCap,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
