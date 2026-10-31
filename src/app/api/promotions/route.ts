import { NextRequest, NextResponse } from "next/server";
import {
  containsBannedAlcoholCompLanguage,
  sanitizePublicText,
  syncStoreFromSupabase,
  persistStoreToSupabase,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await syncStoreFromSupabase();
  return NextResponse.json({
    promotions: store.promotions,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = String(body.title || "");
  const description = String(body.description || "");
  const compType = String(body.compType || "food_kitchen") as
    | "cash_platform"
    | "food_kitchen"
    | "non_alcoholic"
    | "cover_split";

  if (
    containsBannedAlcoholCompLanguage(title) ||
    containsBannedAlcoholCompLanguage(description)
  ) {
    return NextResponse.json(
      {
        error:
          "LEGAL_COMPLIANCE_BLOCK (Ohio Rule 50 / ORC 4301.22(D)): Offers must use Cash via Platform, Food/Kitchen Comp, or Non-Alcoholic Refreshments only.",
      },
      { status: 400 }
    );
  }

  const store = await syncStoreFromSupabase();
  const promo = {
    id: `promo-${Date.now()}`,
    venueSlug: String(body.venueSlug || "time-warp-bar"),
    venueName: sanitizePublicText(String(body.venueName || "Time Warp Bar")),
    tenantId: String(
      body.tenantId || "11111111-1111-4111-8111-111111111101"
    ),
    title: sanitizePublicText(title),
    promoCategory: (body.promoCategory || "Food Special") as
      | "Food Special"
      | "Late Night Happy Hour"
      | "Theme Night"
      | "Featured Listing",
    compType,
    description: sanitizePublicText(description),
    active: true,
    createdAt: new Date().toISOString(),
  };

  store.promotions.unshift(promo);
  await persistStoreToSupabase(store);

  return NextResponse.json({
    ok: true,
    promotion: promo,
  });
}
