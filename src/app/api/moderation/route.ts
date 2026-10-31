import { NextRequest, NextResponse } from "next/server";
import {
  sanitizePublicText,
  syncStoreFromSupabase,
  persistStoreToSupabase,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await syncStoreFromSupabase();
  return NextResponse.json({
    reports: store.moderationReports,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await syncStoreFromSupabase();

  const report = {
    id: `mod-${Date.now()}`,
    targetType: (body.targetType || "night") as "profile" | "night" | "photo",
    targetId: String(body.targetId || ""),
    targetLabel: sanitizePublicText(String(body.targetLabel || "")),
    reason: sanitizePublicText(String(body.reason || "Community report")),
    status: "open" as const,
    createdAt: new Date().toISOString(),
  };

  store.moderationReports.unshift(report);
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    report,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { reportId, status } = body;
  const store = await syncStoreFromSupabase();

  const report = store.moderationReports.find((r) => r.id === reportId);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  report.status = status;
  if (status === "hidden" && report.targetType === "night") {
    const night = store.nights.find((n) => n.id === report.targetId);
    if (night) {
      night.confidence = "archived";
    }
  }
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    report,
  });
}
