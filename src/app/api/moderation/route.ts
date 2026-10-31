import { NextRequest, NextResponse } from "next/server";
import { getStore, sanitizePublicText } from "@/lib/store";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    reports: store.moderationReports,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = getStore();

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

  return NextResponse.json({
    ok: true,
    report,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { reportId, status } = body;
  const store = getStore();

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

  return NextResponse.json({
    ok: true,
    report,
  });
}
