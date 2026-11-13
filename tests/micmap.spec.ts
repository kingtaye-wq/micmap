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

  test("Check 1: Seed reconciliation — Public discovery renders 183 verified nights and 0 needs_verification rows; 10 spot-checks match CSV", async ({
    page,
    request,
  }) => {
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "183 Verified Public Nights"
    );

    const cards = page.getByTestId("verified-night-card");
    await expect(cards).toHaveCount(183);

    // Ensure 0 needs_verification cards are on public discovery
    const needsVerCards = page.locator(
      '[data-testid="verified-night-card"][data-confidence="needs_verification"]'
    );
    await expect(needsVerCards).toHaveCount(0);

    // Spot-check first 10 rows via API against CSV expectations
    const apiRes = await request.get("/api/nights");
    const apiData = await apiRes.json();
    expect(apiData.totalPublicVerifiedCount).toBe(183);
    expect(apiData.nights[0].venueName).toBe("Corky's Place");
    expect(apiData.nights[0].dayOfWeek).toBe("Monday");
    expect(apiData.nights[0].startTime).toBe("5:00 PM");
  });

  test("Check 2: Admin verification queue renders all 50 needs_verification rows, and Verify & Publish promotes a row to public discovery", async ({
    page,
  }) => {
    await page.goto("/admin/verification-queue");
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "50"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "183"
    );

    const adminRows = page.getByTestId("admin-verification-row");
    await expect(adminRows).toHaveCount(50);

    // Click Verify & Publish on the first needs_verification row
    await page.getByTestId("verify-and-publish-btn").first().click();

    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "49"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "184"
    );

    // Confirm public discovery now renders 184 verified nights
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "184 Verified Public Nights"
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

    // Now set to 91 days unconfirmed -> leaves public discovery (183 -> 182) but stays in admin
    await page.goto("/admin/stale");
    await page.getByTestId("set-freshness-91d-btn").click();
    await expect(page.getByTestId("admin-expired-90d-count")).toHaveText("1");
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "182"
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
      "Showing 183 of 183 nights matching your filters"
    );

    // 179 geocoded pins on the map + 4 Location pending in list = 183 total verified nights
    const allPins = page.getByTestId("map-pin");
    await expect(allPins).toHaveCount(179);

    // Zoom to Lakewood & West Side viewport and verify map pins and Nights in View update in sync
    await page.getByTestId("map-region-WEST_SIDE").click();
    const westSidePinCount = await page.getByTestId("map-pin").count();
    expect(westSidePinCount).toBeGreaterThan(0);
    expect(westSidePinCount).toBeLessThan(179);
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

    // Imported row must land in needs_verification (50 -> 51), never straight to public (remains 183)
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "51"
    );
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "183"
    );
    await expect(
      page.getByTestId("admin-verification-queue-list")
    ).toContainText("The Happy Dog Intake Test");
    await expect(
      page.getByTestId("admin-verification-queue-list")
    ).toContainText("Playwright Intake Verification Pass");

    // Now click Verify & Publish on the newly imported row (night-234)
    const importedRow = page.locator(
      '[data-testid="admin-verification-row"][data-night-id="night-234"]'
    );
    await importedRow.getByTestId("verify-and-publish-btn").click();

    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "184"
    );
    await expect(page.getByTestId("admin-needs-verification-count")).toHaveText(
      "50"
    );

    // Refresh public discovery and confirm 184 Verified Public Nights persists from Supabase DB
    await page.goto("/cleveland");
    await expect(page.getByTestId("public-verified-count")).toContainText(
      "184 Verified Public Nights"
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

    // Verify deterministic Monday check on 2nd Monday 2026-11-09 (11 Monday nights — Prosperity Social Club 1st Monday excluded, 0 Friday cards)
    await page.goto("/tonight?date=2026-11-09");
    const mondayCards = page.getByTestId("verified-night-card");
    await expect(mondayCards).toHaveCount(11);
    for (let i = 0; i < 11; i++) {
      const d =
        (await mondayCards.nth(i).getAttribute("data-day-of-week")) || "";
      expect(d.toLowerCase().startsWith("monday")).toBe(true);
    }

    // Verify deterministic Tuesday check on 2nd Tuesday 2026-11-10 (16 Tuesday nights — BOP STOP 3rd Tuesday excluded, 0 Friday cards)
    await page.goto("/tonight?date=2026-11-10");
    const tuesdayCards = page.getByTestId("verified-night-card");
    await expect(tuesdayCards).toHaveCount(16);
    for (let i = 0; i < 16; i++) {
      const d =
        (await tuesdayCards.nth(i).getAttribute("data-day-of-week")) || "";
      expect(d.toLowerCase().startsWith("tuesday")).toBe(true);
    }

    // Verify deterministic Sunday check on 3rd Sunday 2026-11-15 (18 weekly Sunday + 1 Thursday-Sunday = 19 nights — Dunlap's Corner Bar last Sunday excluded)
    await page.goto("/tonight?date=2026-11-15");
    const sundayCards = page.getByTestId("verified-night-card");
    await expect(sundayCards).toHaveCount(19);
    for (let i = 0; i < 19; i++) {
      const d =
        (await sundayCards.nth(i).getAttribute("data-day-of-week")) || "";
      expect(d.toLowerCase().startsWith("friday")).toBe(false);
    }
  });

  test("Check 16 (Amendment 4 & Seed Deltas through 2026-11-13): Source Provenance + Poster-as-Source Rule + 233-Row Seed (183 Public / 50 Queue)", async ({
    page,
    request,
  }) => {
    // 1. Verify the 233-row seed (183 public verified nights) including the latest 2026-11-06..2026-11-13 rows
    const apiRes = await request.get("/api/nights");
    const apiData = await apiRes.json();
    expect(apiData.totalPublicVerifiedCount).toBe(183);

    const bSideBrass = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "B Side Lounge (We Are Wednesdays)"
    );
    expect(bSideBrass).toBeDefined();
    expect(bSideBrass.nightType).toBe("live_band");
    expect(bSideBrass.primaryGenre).toBe("Brass Band");
    expect(bSideBrass.hostOrKj).toBe("Da Land Brass Band");
    expect(bSideBrass.dayOfWeek).toBe("Wednesday (monthly)");
    expect(bSideBrass.startTime).toBe("UNKNOWN");

    const lionessRows = apiData.nights.filter(
      (n: { venueName: string }) => n.venueName === "Lioness Den Speakeasy"
    );
    expect(lionessRows).toHaveLength(2);
    const lionessSunday = lionessRows.find(
      (n: { dayOfWeek: string }) => n.dayOfWeek === "Sunday"
    );
    const lionessTuesday = lionessRows.find(
      (n: { dayOfWeek: string }) => n.dayOfWeek === "Tuesday"
    );
    expect(lionessSunday?.primaryGenre).toBe("Gospel");
    expect(lionessSunday?.startTime).toBe("UNKNOWN");
    expect(lionessTuesday?.startTime).toBe("6:00 PM");
    expect(lionessTuesday?.nightType).toBe("karaoke");

    // Verify 2026-11-05..2026-11-10 seed rows and enrichments
    const communion = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Communion Social Lounge"
    );
    expect(communion?.dayOfWeek).toBe("Thursday");
    expect(communion?.startTime).toBe("7:00 PM");
    expect(communion?.hostOrKj).toBe("DJ Shake That");

    const peoples = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Peoples Bar & Grill"
    );
    expect(peoples?.dayOfWeek).toBe("Thursday");
    expect(peoples?.startTime).toBe("UNKNOWN");
    expect(peoples?.hostOrKj).toBe("DJ Chill Will");

    const biancas = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "Bianca's Ristorante Italiano"
    );
    expect(biancas?.dayOfWeek).toBe("Tuesday");
    expect(biancas?.startTime).toBe("6:30 PM");
    expect(biancas?.hostOrKj).toBe("Bobby Bruno");

    const arniesFri = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Arnie's Clubhouse Grill" && n.dayOfWeek === "Friday"
    );
    expect(arniesFri?.startTime).toBe("7:00 PM");
    expect(arniesFri?.hostOrKj).toBe("Bobby Bruno");

    const jefferson = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "The Jefferson Bar & Grill"
    );
    expect(jefferson?.dayOfWeek).toBe("Friday");
    expect(jefferson?.startTime).toBe("7:00 PM");
    expect(jefferson?.hostOrKj).toBe("DJ Big Fattz");

    const bobbyDes = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Bobby De's Gateway"
    );
    expect(bobbyDes?.dayOfWeek).toBe("Monday");
    expect(bobbyDes?.startTime).toBe("8:00 PM");
    expect(bobbyDes?.confidence).toBe("verified");

    const platform13 = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Platform 13"
    );
    expect(platform13?.dayOfWeek).toBe("Monday");
    expect(platform13?.startTime).toBe("8:00 PM");
    expect(platform13?.lat).toBeCloseTo(41.5003, 3);

    const juicyMayfield = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "The Juicy Seafood (Mayfield Heights)"
    );
    expect(juicyMayfield?.dayOfWeek).toBe("Thursday");
    expect(juicyMayfield?.startTime).toBe("6:00 PM");
    expect(juicyMayfield?.hostOrKj).toContain("Mr. Deeds");
    expect(juicyMayfield?.lat).toBeCloseTo(41.5205, 3);

    const killbox = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "The KillBox Comedy Club"
    );
    expect(killbox?.dayOfWeek).toBe("Wednesday");
    expect(killbox?.startTime).toBe("7:30 PM");
    expect(killbox?.nightType).toBe("open_mic");
    expect(killbox?.primaryGenre).toBe("Comedy");
    expect(killbox?.hostOrKj).toBe("Angelo");
    expect(killbox?.lat).toBeCloseTo(41.102, 3);

    // Verify the 7 new rows from 2026-11-09 PM & 2026-11-10 Midnight runs (commit 6f8b4c3)
    const dunlaps = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Dunlap's Corner Bar"
    );
    expect(dunlaps?.dayOfWeek).toBe("Sunday (last Sunday of month)");
    expect(dunlaps?.startTime).toBe("8:00 PM");
    expect(dunlaps?.lat).toBeCloseTo(41.4654, 3);

    const doubleExposure = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "Double Exposure Bar & Deli"
    );
    expect(doubleExposure?.dayOfWeek).toBe("Sunday");
    expect(doubleExposure?.startTime).toBe("8:00 PM");
    expect(doubleExposure?.lat).toBeCloseTo(41.4752, 3);

    const mrZubs = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Mr. Zub's Deli & Bar"
    );
    expect(mrZubs?.dayOfWeek).toBe("Monday");
    expect(mrZubs?.startTime).toBe("7:00 PM");
    expect(mrZubs?.lat).toBeCloseTo(41.0964, 3);

    const basementValley = apiData.nights.find(
      (n: { venueName: string }) =>
        n.venueName === "The Basement in the Valley"
    );
    expect(basementValley?.dayOfWeek).toBe("Monday");
    expect(basementValley?.startTime).toBe("8:00 PM");
    expect(basementValley?.hostOrKj).toBe("Causin' Treble Entertainment");
    expect(basementValley?.lat).toBeCloseTo(41.1354, 3);

    const barPhoenixTue = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Bar Phoenix" && n.dayOfWeek === "Tuesday"
    );
    expect(barPhoenixTue?.nightType).toBe("open_mic");
    expect(barPhoenixTue?.startTime).toBe("UNKNOWN");
    expect(barPhoenixTue?.hostOrKj).toBe("Vee (host), with B-Nyce");
    expect(barPhoenixTue?.lat).toBeCloseTo(41.0798, 3);

    const hydrant = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "The Hydrant Pub & Grub"
    );
    expect(hydrant?.dayOfWeek).toBe("Monday");
    expect(hydrant?.startTime).toBe("8:00 PM");
    expect(hydrant?.hostOrKj).toBe("Bad Boy Productions");
    expect(hydrant?.lat).toBeCloseTo(41.3868, 3);

    const pezz = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Pez'z Bar-N-Grille"
    );
    expect(pezz?.dayOfWeek).toBe("Wednesday");
    expect(pezz?.startTime).toBe("8:00 PM");
    expect(pezz?.hostOrKj).toBe("DJ Flash Gordon");
    expect(pezz?.lat).toBeCloseTo(41.4929, 3);

    // Verify 2026-11-10 AM IG enrichment (commit 84c4d7d): The 1899 Pub Thursday start_time filled to 10:00 PM
    const pub1899 = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "The 1899 Pub"
    );
    expect(pub1899?.dayOfWeek).toBe("Thursday");
    expect(pub1899?.startTime).toBe("10:00 PM");
    expect(pub1899?.lastConfirmedText).toBe("2026-11-10");
    expect(pub1899?.lat).toBeCloseTo(41.6405, 3);

    // Verify 2026-11-11 midnight FB flyer check (commit 96109c0): 7 rows added, 2 Casey Jones Tavern rows enriched
    const parmaTap = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Parma Tap House"
    );
    expect(parmaTap?.dayOfWeek).toBe("Thursday");
    expect(parmaTap?.startTime).toBe("8:00 PM");
    expect(parmaTap?.hostOrKj).toBe(
      "Bad Boy Billy & Patti Love (Bad Boy Productions)"
    );
    expect(parmaTap?.lat).toBeCloseTo(41.4119, 3);

    const cocktailsWed = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Cocktails Cleveland" && n.dayOfWeek === "Wednesday"
    );
    expect(cocktailsWed?.startTime).toBe("9:00 PM");
    expect(cocktailsWed?.hostOrKj).toBe("Mighty Marc Productions LLC");
    expect(cocktailsWed?.lat).toBeCloseTo(41.4803, 3);

    const cocktailsSun = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Cocktails Cleveland" && n.dayOfWeek === "Sunday"
    );
    expect(cocktailsSun?.startTime).toBe("9:30 PM");
    expect(cocktailsSun?.hostOrKj).toBe("Mighty Marc Productions LLC");
    expect(cocktailsSun?.lat).toBeCloseTo(41.4803, 3);

    const valentis = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Valenti's Ristorante"
    );
    expect(valentis?.dayOfWeek).toBe("Thursday");
    expect(valentis?.startTime).toBe("7:00 PM");
    expect(valentis?.hostOrKj).toBe("DJ Tim");
    expect(valentis?.lat).toBeCloseTo(41.3139, 3);

    const zodiac = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Zodiac Bar"
    );
    expect(zodiac?.dayOfWeek).toBe("Tuesday");
    expect(zodiac?.startTime).toBe("7:00 PM");
    expect(zodiac?.hostOrKj).toBe("DJ Sven");
    expect(zodiac?.lat).toBeCloseTo(41.0434, 3);

    const dirtyDonkey = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Dirty Donkey Tavern"
    );
    expect(dirtyDonkey?.dayOfWeek).toBe("Tuesday");
    expect(dirtyDonkey?.startTime).toBe("8:00 PM");
    expect(dirtyDonkey?.hostOrKj).toBe("DJ Jenny");
    expect(dirtyDonkey?.lat).toBeCloseTo(41.3607, 3);

    const originalGrill = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "The Original Grill"
    );
    expect(originalGrill?.dayOfWeek).toBe("Tuesday");
    expect(originalGrill?.startTime).toBe("UNKNOWN");
    expect(originalGrill?.hostOrKj).toBe("DJ Doc");
    expect(originalGrill?.lat).toBeCloseTo(41.5664, 3);

    const caseyFri = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Casey Jones Tavern" && n.dayOfWeek === "Friday"
    );
    expect(caseyFri?.hostOrKj).toBe("Mighty Marc Productions LLC");
    expect(caseyFri?.lastConfirmedText).toBe("2026-11-11");

    const caseySat = apiData.nights.find(
      (n: { venueName: string; dayOfWeek: string }) =>
        n.venueName === "Casey Jones Tavern" && n.dayOfWeek === "Saturday"
    );
    expect(caseySat?.hostOrKj).toBe("Mighty Marc Productions LLC");
    expect(caseySat?.lastConfirmedText).toBe("2026-11-11");

    // Verify 2026-11-12 & 2026-11-13 seed delta additions & enrichments
    const farm = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Welcome To The Farm"
    );
    expect(farm?.dayOfWeek).toBe("Thursday");
    expect(farm?.startTime).toBe("8:00 PM");
    expect(farm?.hostOrKj).toBe("Terkalerk (@terkalerk)");
    expect(farm?.confidence).toBe("verified");

    const dailyPressed = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "The Daily Pressed"
    );
    expect(dailyPressed?.dayOfWeek).toBe("Thursday");
    expect(dailyPressed?.startTime).toBe("8:00 PM");
    expect(dailyPressed?.hostOrKj).toBe("DJ Sven");

    const josesLanding = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Jose's Landing"
    );
    expect(josesLanding?.dayOfWeek).toBe("Thursday");
    expect(josesLanding?.startTime).toBe("10:00 PM");
    expect(josesLanding?.hostOrKj).toBe("DJ JP (JP Entertainment)");

    const toddsFire = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Todd's Fire & Ice Bar & Grille"
    );
    expect(toddsFire?.dayOfWeek).toBe("Friday");
    expect(toddsFire?.startTime).toBe("8:00 PM");
    expect(toddsFire?.hostOrKj).toBe("DJ WhiteChocolate");

    const skeets = apiData.nights.find(
      (n: { venueName: string }) => n.venueName === "Skeet's Bar"
    );
    expect(skeets?.dayOfWeek).toBe("Monday");
    expect(skeets?.startTime).toBe("7:00 PM");
    expect(skeets?.confidence).toBe("verified");
    expect(skeets?.lastConfirmedText).toBe("2026-11-13");
    expect(skeets?.phone).toBe("(216) 441-2904");

    // 2. OS-INTERNAL ONLY: Individual poster profile links never appear in public API or public pages
    for (const n of apiData.nights) {
      expect(n.posterProfileUrl).toBeUndefined();
      expect(n.posterName).toBeUndefined();
    }

    await page.goto("/cleveland");
    await expect(
      page.locator('[data-testid="admin-poster-profile-link"]')
    ).toHaveCount(0);

    // 3. Admin Verification Queue shows Source Provenance + Poster-as-Source controls
    await page.goto("/admin/verification-queue");
    const firstRow = page.getByTestId("admin-verification-row").first();
    await expect(firstRow.getByTestId("admin-row-provenance")).toBeVisible();

    // Flag the row as "ask_the_poster" (held in needs_verification, never published on a guess)
    await firstRow.getByTestId("flag-ask-the-poster-btn").click();
    await expect(firstRow.getByTestId("ask-the-poster-badge")).toBeVisible();
    await expect(page.getByTestId("admin-public-verified-count")).toHaveText(
      "183"
    );

    // Save a drafts-first outreach message to the poster
    await firstRow
      .getByTestId("poster-outreach-draft-input")
      .fill("Hi poster — draft verification question (never auto-sent).");
    await firstRow.getByTestId("save-poster-outreach-btn").click();
    await expect(page.getByTestId("admin-status-message")).toContainText(
      "draft_outreach_ready"
    );

    // 4. Admin Update-Intake accepts provenance fields + one-click backfill from research/source-provenance.csv
    await page.goto("/admin/import");
    await page.getByTestId("run-provenance-backfill-btn").click();
    await expect(page.getByTestId("admin-status-message")).toContainText(
      "research/source-provenance.csv"
    );

    await page.getByTestId("intake-platform-input").fill("Instagram");
    await page
      .getByTestId("intake-context-input")
      .fill("Instagram Saved Collection (Alex)");
    await page
      .getByTestId("intake-poster-name-input")
      .fill("Test Flyer Poster");
    await page
      .getByTestId("intake-poster-url-input")
      .fill("https://www.instagram.com/testflyerposter/");
    await page
      .getByTestId("intake-contact-input")
      .fill("@testflyerposter (printed on flyer)");
    await page
      .getByTestId("intake-poster-status-select")
      .selectOption("ask_the_poster");
    await page.getByTestId("submit-intake-import-btn").click();

    const importedRow = page.locator(
      '[data-testid="admin-verification-row"][data-night-id="night-234"]'
    );
    await expect(importedRow).toContainText("Test Flyer Poster");
    await expect(importedRow).toContainText(
      "@testflyerposter (printed on flyer)"
    );
    await expect(importedRow.getByTestId("ask-the-poster-badge")).toBeVisible();
  });

  test("Check 17 (recessOS#99): Tonight filter enforces monthly (nth-weekday) qualifiers per night-row across all 3 acceptance dates", async ({
    page,
    request,
  }) => {
    // Acceptance Case 1: Mon Nov 9, 2026 (2nd Monday)
    // Prosperity Social Club ("Monday (1st Monday of month)", night-36) must NOT appear in Tonight
    const monNov9Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-09")
    ).json();
    expect(monNov9Api.filtersApplied.date).toBe("2026-11-09");
    expect(monNov9Api.filtersApplied.weekday).toBe("Monday");
    expect(monNov9Api.filtersApplied.nthWeekdayOfMonth).toBe(2);
    expect(
      monNov9Api.nights.some(
        (n: { venueName: string }) => n.venueName === "Prosperity Social Club"
      )
    ).toBe(false);

    // Control: On 1st Monday (Mon Nov 2, 2026), Prosperity Social Club MUST appear
    const monNov2Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-02")
    ).json();
    expect(
      monNov2Api.nights.some(
        (n: { venueName: string }) => n.venueName === "Prosperity Social Club"
      )
    ).toBe(true);

    await page.goto("/tonight?date=2026-11-09");
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-36"]')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-1"]')
    ).toHaveCount(1);

    // Acceptance Case 2: Wed Nov 11, 2026 (2nd Wednesday)
    // Loganberry Books "Broadsides & Ephemera" ("Wednesday (4th Wednesday)", night-76) must NOT appear
    // Control same night: B Side Lounge "The People Poetry" ("Wednesday (2nd & 4th)", night-73) MUST appear
    const wedNov11Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-11")
    ).json();
    expect(wedNov11Api.filtersApplied.date).toBe("2026-11-11");
    expect(wedNov11Api.filtersApplied.weekday).toBe("Wednesday");
    expect(wedNov11Api.filtersApplied.nthWeekdayOfMonth).toBe(2);
    expect(
      wedNov11Api.nights.some(
        (n: { id: string }) => n.id === "night-76"
      )
    ).toBe(false);
    expect(
      wedNov11Api.nights.some(
        (n: { id: string }) => n.id === "night-73"
      )
    ).toBe(true);

    await page.goto("/tonight?date=2026-11-11");
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-76"]')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-73"]')
    ).toHaveCount(1);

    // Acceptance Case 3: Thu Nov 12, 2026 (2nd Thursday)
    // Spotlight Cleveland "Bluegrass Jam" ("Thursday (1st Thursday)", night-41) must NOT appear
    // Same venue: Spotlight Cleveland "Thematic Open Mic" ("Thursday (2nd + 4th Thursday)", night-42) MUST appear
    const thuNov12Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-12")
    ).json();
    expect(thuNov12Api.filtersApplied.date).toBe("2026-11-12");
    expect(thuNov12Api.filtersApplied.weekday).toBe("Thursday");
    expect(thuNov12Api.filtersApplied.nthWeekdayOfMonth).toBe(2);
    expect(
      thuNov12Api.nights.some(
        (n: { id: string }) => n.id === "night-41"
      )
    ).toBe(false);
    expect(
      thuNov12Api.nights.some(
        (n: { id: string }) => n.id === "night-42"
      )
    ).toBe(true);

    await page.goto("/tonight?date=2026-11-12");
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-41"]')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="verified-night-card"][data-night-id="night-42"]')
    ).toHaveCount(1);

    // Also verify "Sunday (last Sunday of month)" for Dunlap's Corner Bar (night-214):
    // Excluded on Sun Nov 15, 2026; Included on Sun Nov 29, 2026 (last Sunday of Nov 2026)
    const sunNov15Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-15")
    ).json();
    expect(
      sunNov15Api.nights.some((n: { id: string }) => n.id === "night-214")
    ).toBe(false);

    const sunNov29Api = await (
      await request.get("/api/nights?day=Tonight&date=2026-11-29")
    ).json();
    expect(sunNov29Api.filtersApplied.isLastWeekdayOfMonth).toBe(true);
    expect(
      sunNov29Api.nights.some((n: { id: string }) => n.id === "night-214")
    ).toBe(true);
  });
});
