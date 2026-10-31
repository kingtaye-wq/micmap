"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  APP_NAME,
  APP_DOMAIN,
  KJ_PAYOUT_MINIMUM_CENTS,
  PRICING_TIERS,
  TIP_PLATFORM_FEE_BPS,
} from "@/config/brand";
import { TEST_ACCOUNTS, TestAccount } from "@/lib/types";
import {
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Printer,
  Send,
  Edit3,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";

interface TenantPayload {
  actor: TestAccount;
  tenantId: string;
  hostProfile: {
    displayName: string;
    slug: string;
    bio: string;
    genresSupported: string[];
    isFoundingKj: boolean;
    planTier: string;
    smsSegmentsUsed: number;
    smsSegmentsCap: number;
    followerCount: number;
    availableBalanceCents: number;
  } | null;
  nights: {
    id: string;
    venueName: string;
    dayOfWeek: string;
    startTime: string;
    primaryGenre: string;
    alsoWelcome: string;
    roomCode: string;
    lastConfirmedText: string;
  }[];
  follows: {
    id: string;
    followerEmail: string;
    smsOptIn: boolean;
    stopped: boolean;
  }[];
  tips: {
    id: string;
    tipperName: string;
    grossCents: number;
    platformFeeCents: number;
    netKjCents: number;
    payoutStatus: string;
  }[];
}

export default function MicMapOsPage() {
  const [activeEmail, setActiveEmail] = useState(
    "meshell@shellyeahevents.com"
  );
  const [tenantData, setTenantData] = useState<TenantPayload | null>(null);
  const [rlsTestResult, setRlsTestResult] = useState<{
    status: number;
    message: string;
  } | null>(null);

  const [alertText, setAlertText] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  const [designRequest, setDesignRequest] = useState("");
  const [designRequestSent, setDesignRequestSent] = useState(false);

  const [editNightId, setEditNightId] = useState<string | null>(null);
  const [editGenre, setEditGenre] = useState("");
  const [editTime, setEditTime] = useState("");

  async function fetchTenantWorkspace(email: string) {
    const res = await fetch(
      `/api/os/tenant-data?actorEmail=${encodeURIComponent(email)}`,
      {
        headers: { "x-user-email": email },
      }
    );
    const data = await res.json();
    if (res.ok) {
      setTenantData(data);
      setRlsTestResult(null);
    }
  }

  useEffect(() => {
    fetchTenantWorkspace(activeEmail);
  }, [activeEmail]);

  async function testCrossTenantIsolationViolation() {
    // KJ A attempts to read KJ B's tenant_id (11111111-1111-4111-8111-111111111102)
    const targetOtherTenantId =
      activeEmail === "meshell@shellyeahevents.com"
        ? "11111111-1111-4111-8111-111111111102"
        : "11111111-1111-4111-8111-111111111101";

    const res = await fetch(
      `/api/os/tenant-data?actorEmail=${encodeURIComponent(
        activeEmail
      )}&targetTenantId=${targetOtherTenantId}`,
      {
        headers: {
          "x-user-email": activeEmail,
          "x-target-tenant-id": targetOtherTenantId,
        },
      }
    );
    const data = await res.json();
    setRlsTestResult({
      status: res.status,
      message: data.error || "Allowed (Admin)",
    });
  }

  async function handleSaveNightEdit(nightId: string) {
    await fetch("/api/os/tenant-data", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": activeEmail,
      },
      body: JSON.stringify({
        actorEmail: activeEmail,
        action: "update_own_night",
        nightId,
        primaryGenre: editGenre || undefined,
        startTime: editTime || undefined,
      }),
    });
    setEditNightId(null);
    await fetchTenantWorkspace(activeEmail);
  }

  async function handleSendFollowerAlert(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/os/tenant-data", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": activeEmail,
      },
      body: JSON.stringify({
        actorEmail: activeEmail,
        action: "send_follower_alert",
        channel: "sms",
        message: alertText,
      }),
    });
    setAlertSent(true);
    setAlertText("");
    await fetchTenantWorkspace(activeEmail);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Mic Map OS Header & Test Login Switcher */}
      <div className="rounded-3xl border border-[#00F0FF]/40 bg-[#151525] p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#00F0FF]">
              <LayoutDashboard className="h-4 w-4" />
              <span>
                {APP_NAME} OS ({APP_DOMAIN}) • RLS Tenant-Isolated Dashboard
              </span>
            </div>
            <h1 className="font-display mt-1 text-2xl font-bold text-[#F8F9FA] sm:text-4xl">
              {APP_NAME} Operator &amp; Host OS
            </h1>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Every query is scoped by <code>tenant_id</code> and enforced by Supabase Row Level Security.
            </p>
          </div>

          {/* Test Login Switcher (mvp-build-packet.md §9: admin, KJ A, KJ B, fan) */}
          <div className="rounded-2xl border border-white/15 bg-[#0B0B14] p-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#00F0FF]">
              Switch Active Test Login Session
            </label>
            <select
              value={activeEmail}
              onChange={(e) => setActiveEmail(e.target.value)}
              className="mt-1 rounded-xl border border-white/15 bg-[#151525] px-3 py-1.5 text-xs font-bold text-[#F8F9FA]"
              data-testid="os-test-login-select"
            >
              {TEST_ACCOUNTS.map((acc) => (
                <option key={acc.id} value={acc.email}>
                  {acc.role.toUpperCase()}: {acc.displayName} ({acc.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operator Scorecard Bar */}
        <div
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
          data-testid="os-operator-scorecard"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Public Verified Nights</span>
            <p className="font-mono-code mt-1 text-xl font-bold text-[#00E676]">
              73
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Verification Queue</span>
            <p className="font-mono-code mt-1 text-xl font-bold text-[#FFB800]">
              58
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Platform Tip Fee</span>
            <p className="font-mono-code mt-1 text-xl font-bold text-[#FF2E93]">
              {TIP_PLATFORM_FEE_BPS / 100}%
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Batch Payout Min</span>
            <p className="font-mono-code mt-1 text-xl font-bold text-[#00F0FF]">
              ${(KJ_PAYOUT_MINIMUM_CENTS / 100).toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">KJ Pro Founder / Reg</span>
            <p className="font-mono-code mt-1 text-xl font-bold text-[#F8F9FA]">
              ${PRICING_TIERS.kjProFounderMonthlyCents / 100} / $
              {PRICING_TIERS.kjProRegularMonthlyCents / 100}
            </p>
          </div>
        </div>
      </div>

      {/* Tenant Isolation Verification Banner */}
      {tenantData && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#151525] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-[#00E676]" />
              <div>
                <h2 className="font-display text-sm font-bold text-[#F8F9FA]">
                  Active Tenant Boundary:{" "}
                  <code
                    className="font-mono-code text-[#00F0FF]"
                    data-testid="active-tenant-id"
                  >
                    {tenantData.tenantId}
                  </code>
                </h2>
                <p className="text-xs text-[#A0A3BD]">
                  Logged in as <strong>{tenantData.actor.displayName}</strong> (
                  {tenantData.actor.email})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={testCrossTenantIsolationViolation}
              className="rounded-xl border border-[#FF2E93]/40 bg-[#FF2E93]/15 px-4 py-2 text-xs font-bold text-[#FF2E93]"
              data-testid="test-rls-isolation-btn"
            >
              Test Cross-Tenant Access (Verify 403 RLS Block)
            </button>
          </div>

          {rlsTestResult && (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl border border-[#FFB800]/50 bg-[#0B0B14] p-3 text-xs text-[#FFB800]"
              data-testid="rls-test-result-banner"
            >
              <AlertOctagon className="h-4 w-4 shrink-0" />
              <span>
                <strong>HTTP {rlsTestResult.status}:</strong>{" "}
                {rlsTestResult.message}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tenant Scoped Content */}
      {tenantData && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Own Nights & Instant Schedule/Genre Editor */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#F8F9FA]">
                  Your Claimed Nights ({tenantData.nights.length})
                </h2>
                {tenantData.hostProfile && (
                  <Link
                    href={`/kj/poster/${
                      tenantData.nights[0]?.roomCode || "CLE-018"
                    }?host=${tenantData.hostProfile.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF2E93] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Download QR Poster</span>
                  </Link>
                )}
              </div>
              <p className="mt-1 text-xs text-[#A0A3BD]">
                Edits to your schedule or genre tags go live immediately on your page and stamp <code>last_confirmed</code>.
              </p>

              <div className="mt-4 space-y-3" data-testid="os-tenant-nights">
                {tenantData.nights.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl border border-white/10 bg-[#1E1E34] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display font-bold text-[#F8F9FA]">
                          {n.venueName}
                        </span>
                        <span className="ml-2 text-xs text-[#00F0FF]">
                          ({n.dayOfWeek} • {n.startTime})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNightId(n.id);
                          setEditGenre(n.primaryGenre);
                          setEditTime(n.startTime);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#151525] px-2.5 py-1 text-xs text-[#F8F9FA]"
                      >
                        <Edit3 className="h-3 w-3 text-[#00F0FF]" />
                        <span>Edit Live</span>
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#A0A3BD]">
                      Primary Genre:{" "}
                      <strong className="text-[#FF2E93]">
                        {n.primaryGenre}
                      </strong>{" "}
                      • Also Welcome:{" "}
                      <strong className="text-[#00F0FF]">
                        {n.alsoWelcome}
                      </strong>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#00E676]">
                      {n.lastConfirmedText}
                    </p>

                    {editNightId === n.id && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        <input
                          type="text"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          placeholder="Start time (e.g., 9:00 PM)"
                          className="rounded-lg border border-white/15 bg-[#0B0B14] px-2.5 py-1 text-xs text-[#F8F9FA]"
                        />
                        <input
                          type="text"
                          value={editGenre}
                          onChange={(e) => setEditGenre(e.target.value)}
                          placeholder="Primary genre"
                          className="rounded-lg border border-white/15 bg-[#0B0B14] px-2.5 py-1 text-xs text-[#F8F9FA]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNightEdit(n.id)}
                          className="rounded-lg bg-[#00E676] px-3 py-1 text-xs font-bold text-[#0B0B14]"
                        >
                          Save &amp; Stamp Confirmed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Design Change Request Form */}
            <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
              <h3 className="font-display text-lg font-bold text-[#F8F9FA]">
                File a Page Design-Change Request
              </h3>
              <p className="mt-1 text-xs text-[#A0A3BD]">
                Want custom banner artwork or layout tweaks on your {APP_NAME} host page? Submit a request below.
              </p>
              {designRequestSent ? (
                <p className="mt-3 rounded-xl bg-[#00E676]/15 p-3 text-xs font-bold text-[#00E676]">
                  Design-change request queued!
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setDesignRequestSent(true);
                  }}
                  className="mt-3 flex gap-2"
                >
                  <input
                    type="text"
                    required
                    value={designRequest}
                    onChange={(e) => setDesignRequest(e.target.value)}
                    placeholder="Describe requested profile header, photo, or theme adjustment..."
                    className="flex-1 rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#00F0FF] px-4 py-2 text-xs font-bold text-[#0B0B14]"
                  >
                    Submit Request
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right: Followers, SMS Segment Meter, and Scoped Tips */}
          <div className="space-y-6 lg:col-span-5">
            {tenantData.hostProfile && (
              <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-[#F8F9FA]">
                    Follower Alerts &amp; SMS Segment Meter
                  </h3>
                  <span className="font-mono-code rounded-full bg-[#00F0FF]/15 px-2.5 py-0.5 text-xs font-bold text-[#00F0FF]">
                    {tenantData.hostProfile.smsSegmentsUsed} /{" "}
                    {tenantData.hostProfile.smsSegmentsCap} SMS
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#A0A3BD]">
                  KJ Pro includes ~{PRICING_TIERS.kjProIncludedSmsSegments} SMS segments/mo (push &amp; email unlimited). Opt-in and STOP rules enforced automatically.
                </p>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0B0B14]">
                  <div
                    className="h-full rounded-full bg-[#00F0FF]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (tenantData.hostProfile.smsSegmentsUsed /
                            tenantData.hostProfile.smsSegmentsCap) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <form onSubmit={handleSendFollowerAlert} className="mt-4 space-y-2">
                  <textarea
                    rows={2}
                    required
                    value={alertText}
                    onChange={(e) => setAlertText(e.target.value)}
                    placeholder={`Send Tonight Alert to your ${tenantData.follows.length} opted-in followers...`}
                    className="w-full rounded-xl border border-white/15 bg-[#0B0B14] p-3 text-xs text-[#F8F9FA]"
                  />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF2E93] py-2.5 text-xs font-bold text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Queue Tonight Alert to Followers</span>
                  </button>
                </form>
                {alertSent && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#00E676]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Alert written to internal notification_events queue!</span>
                  </p>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <span className="text-xs font-bold text-[#A0A3BD]">
                    Your Tenant Followers ({tenantData.follows.length}):
                  </span>
                  <div className="mt-2 space-y-1.5" data-testid="os-tenant-followers">
                    {tenantData.follows.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg bg-[#0B0B14] px-3 py-1.5 text-xs"
                      >
                        <span>{f.followerEmail}</span>
                        <span className="text-[#00E676]">
                          {f.smsOptIn ? "SMS + Email Opt-In" : "Email Only"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tenant Scoped Tips */}
            <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#F8F9FA]">
                  Your Tenant Tip Balance
                </h3>
                <span
                  className="font-mono-code text-lg font-bold text-[#00E676]"
                  data-testid="os-tenant-balance"
                >
                  $
                  {(
                    (tenantData.hostProfile?.availableBalanceCents || 0) / 100
                  ).toFixed(2)}
                </span>
              </div>
              <div className="mt-3 space-y-2" data-testid="os-tenant-tips">
                {tenantData.tips.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-[#0B0B14] px-3 py-2 text-xs"
                  >
                    <span>{t.tipperName}</span>
                    <span className="font-mono-code text-[#00E676]">
                      Net ${(t.netKjCents / 100).toFixed(2)} ({t.payoutStatus})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
