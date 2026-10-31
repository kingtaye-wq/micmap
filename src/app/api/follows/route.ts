import { NextRequest, NextResponse } from "next/server";
import { syncStoreFromSupabase, persistStoreToSupabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await syncStoreFromSupabase();

  const targetSlug = String(
    body.targetSlug || "shell-yeah-events-by-meshell"
  );
  const host = store.hosts.find((h) => h.slug === targetSlug);
  const artistOrCrew = store.artistsAndCrews.find((a) => a.slug === targetSlug);
  const tenantId =
    host?.tenantId ||
    artistOrCrew?.tenantId ||
    "11111111-1111-4111-8111-111111111101";
  const targetName =
    host?.displayName ||
    artistOrCrew?.displayName ||
    String(body.targetName || targetSlug);

  const follow = {
    id: `fol-${Date.now()}`,
    followerEmail: String(body.followerEmail || "fan@micmap.co"),
    followerPhone: body.followerPhone ? String(body.followerPhone) : undefined,
    smsOptIn: Boolean(body.smsOptIn),
    targetType: (body.targetType || "person") as "person" | "venue" | "crew",
    targetSlug,
    targetName,
    tenantId,
    stopped: false,
    createdAt: new Date().toISOString(),
  };

  store.follows.unshift(follow);
  if (host) host.followerCount += 1;
  if (artistOrCrew) artistOrCrew.followerCount += 1;

  const notif = {
    id: `notif-${Date.now()}`,
    tenantId,
    eventType: "follow_confirmation" as const,
    channel: "email" as const,
    recipient: follow.followerEmail,
    subject: `You are now following ${targetName} — Tonight alerts enabled`,
    smsSegments: 0,
    ghlSyncStatus: "queued_internal" as const,
    createdAt: new Date().toISOString(),
  };
  store.notificationEvents.unshift(notif);
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    follow,
    notificationEvent: notif,
  });
}
