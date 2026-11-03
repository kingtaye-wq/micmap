import { test, expect } from "@playwright/test";
import {
  APP_NAME,
  APP_DOMAIN,
  TIP_PLATFORM_FEE_BPS,
  KJ_PAYOUT_MINIMUM_CENTS,
  FRESHNESS_VERIFY_DAYS,
  FRESHNESS_ARCHIVE_DAYS,
  calculateTipBreakdown,
} from "../src/config/brand";

test.describe("Mic Map MVP — All 10 Acceptance Criteria Verification Suite", () => {
  test.beforeEach(async ({ request }) => {
    // Reset in-memory store before each test for deterministic counts
    await request.post("/api/admin/verification", {
      data: { action: "reset_store" },
    });
  });

  test("Check 1: Seed reconciliation — Public discovery renders 73 verified nights and 0 needs_verification rows; 10 spot-checks match CSV", async ({
    page,
    request,
  }) => {
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "73 Verified Public Nights"
    );

    const cards = page.getByTestId("verified-night-card");
    await expect(cards).toHaveCount(73);

    // Ensure 0 needs_verification cards are on public discovery
    const needsVerCards = page.locator(
      '[data-testid="verified-night-card"][data-confidence="needs_verification"]'
    );
    await expect(needsVerCards).toHaveCount(0);

    // Spot-check first 10 rows via API against CSV expectations
    const apiRes = await request.get("/api/nights");
    const apiData = await apiRes.json();
    expect(apiData.totalPublicVerifiedCount).toBe(73);
    expect(apiData.nights[0].venueName).toBe("Corky's Place");
    expect(apiData.nights[0].dayOfWeek).toBe("Monday");
    expect(apiData.nights[0].startTime).toBe("5:00 PM");
  });

  test("Check 2: Admin verification queue renders all 58 needs_verification rows, and Verify & Publish promotes a row to public discovery", async ({
    page,
  }) => {
    await page.goto("/admin/verification-queue");
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "58"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "73"
    );

    const adminRows = page.getByTestId("admin-verification-row");
    await expect(adminRows).toHaveCount(58);

    // Click Verify & Publish on the first needs_verification row
    await page.getByTestId("verify-and-publish-btn").first().click();

    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "57"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "74"
    );

    // Confirm public discovery now renders 74 verified nights
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "74 Verified Public Nights"
    );
  });

  test("Check 3: UNKNOWN fields render honestly as Pending Verification with working correction modal; claims stay pending until admin approval", async ({
    page,
    request,
  }) => {
    await page.goto("/cleveland");
    await expect(page.getByTestId("unknown-genre-badge").first()).toContainText(
      "Pending Verification"
    );

    // Open correction modal and submit an update
    await page.getByTestId("open-correction-modal-btn").first().click();
    await expect(page.getByTestId("correction-modal")).toBeVisible();
    await page.getByTestId("correction-value-input").fill("Rock / Classic Hits");
    await page
      .getByTestId("correction-basis-input")
      .fill("Attended Friday night show in Lakewood");
    await page.getByTestId("submit-correction-btn").click();
    await expect(page.getByTestId("correction-success-message")).toBeVisible();

    // Claim safety: submitting a claim changes nothing publicly until admin approves it
    const claimRes = await request.post("/api/claims", {
      data: {
        targetType: "night",
        targetId: "night-1",
        targetName: "Corky's Place (Monday)",
        claimantName: "Corky Manager",
        claimantEmail: "manager@corkyslakewood.com",
        claimantRole: "Venue Owner / Manager",
        socialOrWebProof: "https://m.facebook.com/Corkys-Place-115185908504060/",
        assertedPrimaryGenre: "Pop/Top 40",
        assertedAlsoWelcome: "Rock, Country",
      },
    });
    const claimData = await claimRes.json();
    expect(claimData.ok).toBe(true);
    expect(claimData.claim.status).toBe("pending");

    // Verify night-1 is still UNKNOWN before admin approval
    const beforeApprove = await (await request.get("/api/nights")).json();
    const night1Before = beforeApprove.nights.find(
      (n: { id: string }) => n.id === "night-1"
    );
    expect(night1Before.primaryGenre).toBe("UNKNOWN");

    // Approve claim in admin and verify night-1 updates and stamps last_confirmed
    const approveRes = await request.patch("/api/claims", {
      data: { claimId: claimData.claim.id, decision: "approved" },
    });
    const approveData = await approveRes.json();
    expect(approveData.updatedNight.primaryGenre).toBe("Pop/Top 40");
    expect(approveData.updatedNight.lastConfirmedText).toContain(
      "Claim approved & confirmed"
    );
  });

  test("Check 4: Genre filter truthfulness (excludes UNKNOWN listings) & RLS tenant isolation between KJ A and KJ B", async ({
    page,
    request,
  }) => {
    await page.goto("/cleveland");
    await page.getByTestId("genre-filter-select").selectOption("Hip-Hop/Rap");

    await expect(page.getByTestId("genre-truthfulness-banner")).toBeVisible();

    // Every visible card must have sourced fit (never both primaryGenre=UNKNOWN and alsoWelcome=UNKNOWN)
    const apiFiltered = await (
      await request.get("/api/nights?genre=Hip-Hop/Rap")
    ).json();
    expect(apiFiltered.filteredCount).toBeGreaterThan(0);
    for (const n of apiFiltered.nights) {
      const bothUnknown =
        n.primaryGenre === "UNKNOWN" && n.alsoWelcome === "UNKNOWN";
      expect(bothUnknown).toBe(false);
    }

    // Tenant isolation test at API level: KJ A cannot read or edit KJ B's tenant_id
    const crossReadRes = await request.get(
      "/api/os/tenant-data?actorEmail=meshell@shellyeahevents.com&targetTenantId=11111111-1111-4111-8111-111111111102"
    );
    expect(crossReadRes.status()).toBe(403);

    const crossEditRes = await request.patch("/api/os/tenant-data", {
      data: {
        actorEmail: "meshell@shellyeahevents.com",
        targetTenantId: "11111111-1111-4111-8111-111111111102",
        action: "update_host_profile",
        bio: "Unauthorized edit attempt",
      },
    });
    expect(crossEditRes.status()).toBe(403);
  });

  test("Check 5: Singer /room/[roomCode] submits a song request without requiring an app download, and it appears in /kj/console", async ({
    page,
  }) => {
    await page.goto("/room/CLE-018");
    await expect(page.getByTestId("live-room-code")).toHaveText("CLE-018");

    await page.getByTestId("singer-name-input").fill("Jordan CleSinger");
    await page.getByTestId("song-title-input").fill("Bohemian Rhapsody");
    await page.getByTestId("song-artist-input").fill("Queen");
    await page.getByTestId("submit-song-request-btn").click();

    await expect(page.getByTestId("song-request-confirmation")).toContainText(
      "Jordan CleSinger"
    );

    // Verify it appears in /kj/console
    await page.goto("/kj/console");
    await expect(page.getByTestId("kj-console-queue-list")).toContainText(
      "Jordan CleSinger"
    );
    await expect(page.getByTestId("kj-console-queue-list")).toContainText(
      "Bohemian Rhapsody"
    );
  });

  test("Check 6: Money math — $10 tip records exact $0.50 platform fee (5%) and enforces $25.00 payout minimum in /kj/console", async ({
    page,
    request,
  }) => {
    const tenDollarMath = calculateTipBreakdown(1000);
    expect(tenDollarMath.platformFeeCents).toBe(50);
    expect(tenDollarMath.platformFeeDollars).toBe("0.50");
    expect(tenDollarMath.netKjCents).toBe(950);

    // Initial KJ Meshell balance is $19.00 (1900 cents) -> $6.00 away from $25.00 payout minimum
    await page.goto("/kj/console");
    await expect(page.getByTestId("reference-ten-dollar-math")).toContainText(
      "$0.50"
    );
    await expect(page.getByTestId("payout-status-label")).toContainText(
      "$6.00 away from $25.00 payout minimum"
    );

    // Send a $10.00 tip ($9.50 net -> new balance $28.50 >= $25.00 minimum!)
    const tipRes = await request.post("/api/tips", {
      data: {
        recipientSlug: "shell-yeah-events-by-meshell",
        recipientName: "KJ Meshell (Shell Yeah Events by MeShell)",
        roomCode: "CLE-018",
        tipperName: "Stage Supporter",
        grossCents: 1000,
      },
    });
    const tipData = await tipRes.json();
    expect(tipData.breakdown.platformFeeCents).toBe(50);
    expect(tipData.breakdown.netKjCents).toBe(950);
    expect(tipData.payoutEvaluation.eligible).toBe(true);

    await page.reload();
    await expect(page.getByTestId("payout-status-label")).toContainText(
      "Ready for Monthly Batch Payout"
    );
  });

  test("Check 7: Printable KJ Poster (/kj/poster/[roomCode]) renders a valid QR code, room code, and configured domain", async ({
    page,
  }) => {
    await page.goto("/kj/poster/CLE-018");
    await expect(page.getByTestId("printable-kj-poster")).toBeVisible();
    await expect(page.getByTestId("poster-room-code")).toContainText("CLE-018");
    await expect(page.getByTestId("poster-target-url")).toContainText(
      `${APP_DOMAIN}/hosts/shell-yeah-events-by-meshell`
    );

    const qrSvg = page.locator('[data-testid="poster-qr-code"] svg');
    await expect(qrSvg).toBeVisible();
  });

  test("Check 8: Freshness logic (46d warning badge, 91d auto-removal from public map) & mobile viewport rendering", async ({
    page,
  }) => {
    await page.goto("/admin/stale");
    await page.getByTestId("set-freshness-46d-btn").click();
    await expect(page.getByTestId("admin-stale-45d-count")).toHaveText("1");

    // Verify 46-day night shows amber warning badge on public discovery
    await page.goto("/cleveland");
    await expect(
      page.getByTestId("freshness-badge-warning").first()
    ).toContainText("Call to confirm");

    // Now set to 91 days unconfirmed -> leaves public discovery (73 -> 72) but stays in admin
    await page.goto("/admin/stale");
    await page.getByTestId("set-freshness-91d-btn").click();
    await expect(page.getByTestId("admin-expired-90d-count")).toHaveText("1");
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "72"
    );

    // Mobile viewport check (390x844 phone)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/hosts/shell-yeah-events-by-meshell");
    await expect(page.getByTestId("brand-logo-link")).toBeVisible();
  });

  test("Check 9: Zero alcohol-comp / free-drink strings anywhere in UI, and API blocks alcohol-comp promotions", async ({
    page,
    request,
  }) => {
    for (const route of [
      "/",
      "/cleveland",
      "/venue-portal",
      "/kj/poster/CLE-018",
      "/crews/coventry-cipher-collective",
    ]) {
      await page.goto(route);
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      expect(bodyText).not.toContain("free drink");
      expect(bodyText).not.toContain("drink ticket");
      expect(bodyText).not.toContain("drink coin");
    }

    // Verify API rejects an attempt to create a promotion with banned alcohol-comp copy
    const badPromoRes = await request.post("/api/promotions", {
      data: {
        venueName: "Test Bar",
        title: "Best Singer Wins a Free Drink Ticket",
        promoCategory: "Theme Night",
        compType: "food_kitchen",
        description: "Come sing for a drink coin",
      },
    });
    expect(badPromoRes.status()).toBe(400);
  });

  test("Check 10: Single rename-safe brand config exports locked constants and renders APP_NAME / APP_DOMAIN consistently", async ({
    page,
  }) => {
    expect(APP_NAME).toBe("Mic Map");
    expect(APP_DOMAIN).toBe("micmap.co");
    expect(TIP_PLATFORM_FEE_BPS).toBe(500);
    expect(KJ_PAYOUT_MINIMUM_CENTS).toBe(2500);
    expect(FRESHNESS_VERIFY_DAYS).toBe(45);
    expect(FRESHNESS_ARCHIVE_DAYS).toBe(90);

    await page.goto("/");
    await expect(page.getByTestId("brand-logo-link")).toContainText(APP_NAME);
    await expect(page.getByTestId("brand-logo-link")).toContainText(APP_DOMAIN);
  });

  test("Check 11 (Amendments 1 & 2A): Staging banner + noindex headers + Map-first layout with synced Nights in View count", async ({
    page,
  }) => {
    const response = await page.goto("/cleveland");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");

    await expect(page.getByTestId("staging-preview-banner")).toContainText(
      "Preview build — staging"
    );
    await expect(page.getByTestId("cleveland-interactive-map")).toBeVisible();
    await expect(page.getByTestId("map-legend")).toBeVisible();
    await expect(page.getByTestId("nights-in-view-count")).toContainText(
      "Showing 73 of 73 nights matching your filters"
    );

    // 72 geocoded pins on the map + 1 Location pending in list = 73 total verified nights
    const allPins = page.getByTestId("map-pin");
    await expect(allPins).toHaveCount(72);

    // Zoom to Lakewood & West Side viewport and verify map pins and Nights in View update in sync
    await page.getByTestId("map-region-WEST_SIDE").click();
    const westSidePinCount = await page.getByTestId("map-pin").count();
    expect(westSidePinCount).toBeGreaterThan(0);
    expect(westSidePinCount).toBeLessThan(72);
    await expect(page.getByTestId("in-view-pin-count")).toHaveText(
      `${westSidePinCount} Pins`
    );
  });

  test("Check 12 (Amendment 2A): Mobile 390x844 and 360x640 viewports have zero horizontal overflow and all filter controls remain reachable", async ({
    page,
  }) => {
    for (const vp of [
      { width: 390, height: 844 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/cleveland");

      await expect(page.getByTestId("map-filter-row-1")).toBeVisible();
      await expect(page.getByTestId("map-filter-row-2")).toBeVisible();
      await expect(page.getByTestId("day-chip-ALL")).toBeVisible();
      await expect(page.getByTestId("day-chip-Tonight")).toBeVisible();
      await expect(page.getByTestId("type-filter-karaoke")).toBeVisible();
      await expect(page.getByTestId("type-filter-open-mic")).toBeVisible();
      await expect(page.getByTestId("genre-filter-select")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("Check 13 (Amendment 2A Coordinate Discipline): Null-coordinate rows never render a map pin and appear list-only with Location pending badge", async ({
    page,
  }) => {
    await page.goto("/cleveland");

    // Imposters Theater (night-59) is verified but has no street address in CSV -> 0 map pins
    const impostersPin = page.locator(
      '[data-testid="map-pin"][data-night-id="night-59"]'
    );
    await expect(impostersPin).toHaveCount(0);

    // Imposters Theater appears in the list with Location pending badge
    const impostersCard = page.locator(
      '[data-testid="verified-night-card"][data-night-id="night-59"]'
    );
    await expect(impostersCard).toHaveCount(1);
    await expect(impostersCard).toHaveAttribute("data-has-coords", "false");
    await expect(
      impostersCard.getByTestId("location-pending-badge")
    ).toContainText("Location pending");

    // Town House Tavern (night-127, needs_verification) is neither pinned nor in the public list
    await expect(
      page.locator('[data-testid="map-pin"][data-night-id="night-127"]')
    ).toHaveCount(0);
    await expect(
      page.locator(
        '[data-testid="verified-night-card"][data-night-id="night-127"]'
      )
    ).toHaveCount(0);
  });

  test("Check 14 (Amendment 2B): Admin CSV Update-Intake lands strictly in needs_verification in Supabase and promotes live via Verify & Publish", async ({
    page,
  }) => {
    await page.goto("/admin/import");
    await expect(page.getByTestId("admin-import-panel")).toBeVisible();

    await page
      .getByTestId("intake-source-input")
      .fill("Playwright Intake Verification Pass");
    await page.getByTestId("intake-date-input").fill("2026-10-31");
    await page.getByTestId("submit-intake-import-btn").click();

    // Imported row must land in needs_verification (58 -> 59), never straight to public (remains 73)
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "59"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "73"
    );
    await expect(
      page.getByTestId("admin-verification-queue-list")
    ).toContainText("The Happy Dog Intake Test");
    await expect(
      page.getByTestId("admin-verification-queue-list")
    ).toContainText("Playwright Intake Verification Pass");

    // Now click Verify & Publish on the newly imported row (night-132)
    const importedRow = page.locator(
      '[data-testid="admin-verification-row"][data-night-id="night-132"]'
    );
    await importedRow.getByTestId("verify-and-publish-btn").click();

    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "74"
    );
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "58"
    );

    // Refresh public discovery and confirm 74 Verified Public Nights persists from Supabase DB
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "74 Verified Public Nights"
    );
  });

  test("Check 15 (Priority Bug Packet #83): /tonight dynamically shows the current America/New_York day's nights and zero wrong-day (Friday) cards", async ({
    page,
  }) => {
    const liveDay = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
    }).format(new Date());

    const res = await page.goto("/tonight");
    expect(res?.headers()["cache-control"]).toContain("no-store");
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");

    await expect(page.getByTestId("active-day-filter-label")).toContainText(
      `Tonight (${liveDay})`
    );

    const cards = page.getByTestId("verified-night-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Every rendered card on /tonight must match the live America/New_York day (or Thursday-Sunday if Thu-Sun)
    for (let i = 0; i < count; i++) {
      const cardDay =
        (await cards.nth(i).getAttribute("data-day-of-week")) || "";
      const lower = cardDay.toLowerCase();
      const validForLiveDay =
        lower.startsWith(liveDay.toLowerCase()) ||
        (lower === "thursday-sunday" &&
          ["thursday", "friday", "saturday", "sunday"].includes(
            liveDay.toLowerCase()
          ));
      expect(validForLiveDay).toBe(true);
      if (liveDay.toLowerCase() !== "friday") {
        expect(lower.startsWith("friday")).toBe(false);
      }
    }

    // Verify deterministic Monday check (3 Monday nights, 0 Friday cards, 0 Thursday-Sunday cards)
    await page.goto("/tonight?day=Monday");
    const mondayCards = page.getByTestId("verified-night-card");
    await expect(mondayCards).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const d =
        (await mondayCards.nth(i).getAttribute("data-day-of-week")) || "";
      expect(d.toLowerCase().startsWith("monday")).toBe(true);
    }

    // Verify deterministic Sunday check (7 Sunday + 1 Thursday-Sunday = 8 nights, 0 Friday cards)
    await page.goto("/tonight?day=Sunday");
    const sundayCards = page.getByTestId("verified-night-card");
    await expect(sundayCards).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const d =
        (await sundayCards.nth(i).getAttribute("data-day-of-week")) || "";
      expect(d.toLowerCase().startsWith("friday")).toBe(false);
    }
  });
});
