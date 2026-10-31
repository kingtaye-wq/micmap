"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME, FRESHNESS_ARCHIVE_DAYS, FRESHNESS_VERIFY_DAYS } from "@/config/brand";
import { NightRecord } from "@/lib/types";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Clock,
  RefreshCw,
  ExternalLink,
  Upload,
} from "lucide-react";

interface AdminConsoleViewProps {
  defaultTab?:
    | "verification"
    | "import"
    | "claims"
    | "corrections"
    | "stale"
    | "moderation";
}

export function AdminConsoleView({
  defaultTab = "verification",
}: AdminConsoleViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [counts, setCounts] = useState({
    totalSeededRows: 131,
    publicVerifiedCount: 73,
    needsVerificationCount: 58,
    stale45to89Count: 0,
    expired90dCount: 0,
  });
  const [verificationQueue, setVerificationQueue] = useState<NightRecord[]>([]);
  const [staleWarning, setStaleWarning] = useState<NightRecord[]>([]);
  const [expired90d, setExpired90d] = useState<NightRecord[]>([]);
  const [claims, setClaims] = useState<
    {
      id: string;
      targetType: string;
      targetId: string;
      targetName: string;
      claimantName: string;
      claimantEmail: string;
      claimantRole: string;
      socialOrWebProof: string;
      assertedPrimaryGenre: string;
      assertedAlsoWelcome: string;
      assertedNotAFit: string;
      status: string;
    }[]
  >([]);
  const [corrections, setCorrections] = useState<
    {
      id: string;
      nightId: string;
      venueName: string;
      fieldName: string;
      proposedValue: string;
      sourceOrBasis: string;
      submitterRole: string;
      status: string;
    }[]
  >([]);
  const [reports, setReports] = useState<
    {
      id: string;
      targetType: string;
      targetId: string;
      targetLabel: string;
      reason: string;
      status: string;
    }[]
  >([]);
  const [intakeBatches, setIntakeBatches] = useState<
    {
      id: string;
      source: string;
      intakeDate: string;
      rowsImported: number;
      rowIds: string[];
      createdAt: string;
    }[]
  >([]);
  const [intakeSource, setIntakeSource] = useState(
    "Dre / Weekly Cleveland Venue Pass"
  );
  const [intakeDate, setIntakeDate] = useState("2026-10-31");
  const [intakeCsvText, setIntakeCsvText] = useState(
    `venue_name,neighborhood_city,address,day_of_week,start_time,type,host_or_KJ,primary_genre,also_welcome,not_a_fit,genre_basis,signup_method,cover,age,source_url,last_confirmed,confidence,phone,venue_website,facebook,instagram\nThe Happy Dog Intake Test,Detroit Shoreway,"5801 Detroit Ave, Cleveland, OH",Wednesday,9:00 PM,karaoke,KJ Test Host,Rock,"Pop/Top 40, Throwbacks/Oldies",UNKNOWN,Update intake pass,Paper slip,Free,21+,https://happydogcleveland.com,2026-10-31,verified,216-651-9474,https://happydogcleveland.com,,`
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function refreshAll() {
    const [verRes, claimsRes, corrRes, modRes] = await Promise.all([
      fetch("/api/admin/verification"),
      fetch("/api/claims"),
      fetch("/api/corrections"),
      fetch("/api/moderation"),
    ]);
    const verData = await verRes.json();
    const claimsData = await claimsRes.json();
    const corrData = await corrRes.json();
    const modData = await modRes.json();

    if (verData.counts) setCounts(verData.counts);
    if (Array.isArray(verData.verificationQueue))
      setVerificationQueue(verData.verificationQueue);
    if (Array.isArray(verData.staleWarning))
      setStaleWarning(verData.staleWarning);
    if (Array.isArray(verData.expired90d)) setExpired90d(verData.expired90d);
    if (Array.isArray(verData.intakeBatches))
      setIntakeBatches(verData.intakeBatches);
    if (Array.isArray(claimsData.claims)) setClaims(claimsData.claims);
    if (Array.isArray(corrData.corrections))
      setCorrections(corrData.corrections);
    if (Array.isArray(modData.reports)) setReports(modData.reports);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function handleVerifyAndPublish(nightId: string, venueName: string) {
    const res = await fetch("/api/admin/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_and_publish", nightId }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatusMessage(
        `Promoted "${venueName}" to Public Verified! Public count is now ${data.publicVerifiedCount}.`
      );
      await refreshAll();
    }
  }

  async function handleArchive(nightId: string) {
    await fetch("/api/admin/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", nightId }),
    });
    await refreshAll();
  }

  async function handleSetFreshnessDays(nightId: string, daysAgo: number) {
    const res = await fetch("/api/admin/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_freshness_days", nightId, daysAgo }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatusMessage(
        `Updated ${nightId} freshness to ${daysAgo} days ago (${data.updatedNight.freshnessStatus}). Public count: ${data.publicVerifiedCount}.`
      );
      await refreshAll();
    }
  }

  async function handleClaimDecision(
    claimId: string,
    decision: "approved" | "rejected"
  ) {
    await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, decision }),
    });
    setStatusMessage(`Claim ${decision} and stamped last_confirmed!`);
    await refreshAll();
  }

  async function handleCorrectionDecision(
    correctionId: string,
    decision: "approved" | "rejected"
  ) {
    await fetch("/api/corrections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctionId, decision }),
    });
    setStatusMessage(`Community correction ${decision}!`);
    await refreshAll();
  }

  async function handleIntakeCsvImport(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvContent: intakeCsvText,
        source: intakeSource,
        intakeDate,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatusMessage(
        `Imported ${data.importedCount} row(s) from "${intakeSource}" (${intakeDate}) into Needs Verification Queue (${data.needsVerificationCount} in queue · ${data.publicVerifiedCount} public verified).`
      );
      await refreshAll();
      setActiveTab("verification");
    } else if (data.error) {
      setStatusMessage(`Import error: ${data.error}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header & Reconciliation Counters */}
      <div className="rounded-3xl border border-[#FFB800]/40 bg-[#151525] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#FFB800]">
              <ShieldCheck className="h-4 w-4" />
              <span>{APP_NAME} Admin Console • Seed &amp; Moderation Governance</span>
            </div>
            <h1 className="font-display mt-1 text-2xl font-bold text-[#F8F9FA] sm:text-4xl">
              Admin Verification, Claims &amp; Freshness Queue
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/cleveland"
              className="rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2 font-semibold text-[#00F0FF]"
            >
              View Public Map →
            </Link>
          </div>
        </div>

        {/* Reconciliation Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Total Seeded Rows</span>
            <p
              className="font-mono-code mt-1 text-xl font-bold text-[#F8F9FA]"
              data-testid="admin-total-seeded-count"
            >
              {counts.totalSeededRows}
            </p>
          </div>
          <div className="rounded-2xl border border-[#00E676]/30 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Public Verified Live</span>
            <p
              className="font-mono-code mt-1 text-xl font-bold text-[#00E676]"
              data-testid="admin-public-verified-count"
            >
              {counts.publicVerifiedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#FFB800]/40 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">Needs Verification Queue</span>
            <p
              className="font-mono-code mt-1 text-xl font-bold text-[#FFB800]"
              data-testid="admin-needs-verification-count"
            >
              {counts.needsVerificationCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">
              Stale ({FRESHNESS_VERIFY_DAYS}–89d)
            </span>
            <p
              className="font-mono-code mt-1 text-xl font-bold text-[#FFB800]"
              data-testid="admin-stale-45d-count"
            >
              {counts.stale45to89Count}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3.5">
            <span className="text-[11px] text-[#A0A3BD]">
              Auto-Hidden (&ge;{FRESHNESS_ARCHIVE_DAYS}d)
            </span>
            <p
              className="font-mono-code mt-1 text-xl font-bold text-rose-400"
              data-testid="admin-expired-90d-count"
            >
              {counts.expired90dCount}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab("verification")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "verification"
                ? "bg-[#FFB800] text-[#0B0B14]"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-verification"
          >
            Verification Queue ({verificationQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "import"
                ? "bg-[#00F0FF] text-[#0B0B14]"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-import"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Update-Intake CSV Import</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "claims"
                ? "bg-[#FF2E93] text-white"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-claims"
          >
            Claims Queue ({claims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("corrections")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "corrections"
                ? "bg-[#00F0FF] text-[#0B0B14]"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-corrections"
          >
            Corrections Queue ({corrections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stale")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "stale"
                ? "bg-[#00E676] text-[#0B0B14]"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-stale"
          >
            Freshness Dashboard ({FRESHNESS_VERIFY_DAYS}d / {FRESHNESS_ARCHIVE_DAYS}d)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("moderation")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "moderation"
                ? "bg-white text-[#0B0B14]"
                : "bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
            }`}
            data-testid="tab-moderation"
          >
            UGC Reports ({reports.length})
          </button>
        </div>

        {statusMessage && (
          <div
            className="mt-4 flex items-center gap-2 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-3 text-xs font-bold text-[#00E676]"
            data-testid="admin-status-message"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Verification Queue (58 needs_verification rows) */}
      {activeTab === "verification" && (
        <div
          className="mt-6 space-y-3"
          data-testid="admin-verification-queue-list"
        >
          {verificationQueue.map((row) => (
            <div
              key={row.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#1E1E34] p-4 sm:flex-row sm:items-center"
              data-testid="admin-verification-row"
              data-night-id={row.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-code rounded bg-[#0B0B14] px-2 py-0.5 text-xs text-[#FFB800]">
                    CSV Row #{row.csvRowNumber} • {row.roomCode}
                  </span>
                  <span className="rounded-full bg-[#FF2E93]/20 px-2.5 py-0.5 text-xs font-bold text-[#FF2E93]">
                    {row.nightTypeLabel}
                  </span>
                  <span className="rounded-full border border-[#FFB800]/40 bg-[#FFB800]/10 px-2.5 py-0.5 text-xs font-bold text-[#FFB800]">
                    needs_verification (Hidden from Public)
                  </span>
                </div>

                <h3 className="font-display mt-1.5 text-lg font-bold text-[#F8F9FA]">
                  {row.venueName} —{" "}
                  {row.dayOfWeek === "UNKNOWN"
                    ? "Day Pending Verification"
                    : row.dayOfWeek}
                </h3>
                <p className="text-xs text-[#A0A3BD]">
                  {row.neighborhood} •{" "}
                  {row.address || (
                    <span className="font-bold text-rose-400">
                      Address Missing in CSV (Flagged • Coordinates null)
                    </span>
                  )}{" "}
                  • Start: {row.startTime} • Host: {row.hostOrKj}
                </p>
                <p className="mt-1 text-xs text-[#00F0FF]">
                  Primary Genre: {row.primaryGenre} • Also Welcome:{" "}
                  {row.alsoWelcome}
                </p>
                <p className="mt-0.5 text-[11px] text-[#A0A3BD]">
                  Notes: {row.genreBasis} • Source/Stamp:{" "}
                  <span className="font-semibold text-[#FFB800]">
                    {row.lastConfirmedText}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVerifyAndPublish(row.id, row.venueName)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14] shadow-md hover:opacity-90"
                  data-testid="verify-and-publish-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify &amp; Publish</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(row.id)}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#151525] px-3 py-2 text-xs text-[#A0A3BD] hover:text-rose-400"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 1B: Update-Intake CSV Import */}
      {activeTab === "import" && (
        <div
          className="mt-6 rounded-3xl border border-[#00F0FF]/30 bg-[#151525] p-6"
          data-testid="admin-import-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
                <Upload className="h-5 w-5 text-[#00F0FF]" />
                <span>Update-Intake CSV Importer (Quarantined to Verification Queue)</span>
              </h2>
              <p className="mt-1 text-xs text-[#A0A3BD]">
                Accepts rows in <code>cleveland-venues-master.csv</code> column format. Every imported row lands strictly in{" "}
                <strong className="text-[#FFB800]">confidence = needs_verification</strong> on{" "}
                <code>/admin/verification-queue</code> (never straight to public), stamped with source + date.
              </p>
            </div>
          </div>

          <form onSubmit={handleIntakeCsvImport} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Intake Source / Researcher Pass
                </label>
                <input
                  type="text"
                  value={intakeSource}
                  onChange={(e) => setIntakeSource(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2 text-xs text-[#F8F9FA]"
                  data-testid="intake-source-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Intake Date (YYYY-MM-DD)
                </label>
                <input
                  type="text"
                  value={intakeDate}
                  onChange={(e) => setIntakeDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2 text-xs text-[#F8F9FA]"
                  data-testid="intake-date-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A3BD]">
                CSV Rows (<code>cleveland-venues-master.csv</code> 21-column format)
              </label>
              <textarea
                rows={5}
                value={intakeCsvText}
                onChange={(e) => setIntakeCsvText(e.target.value)}
                className="font-mono-code mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] p-3 text-xs text-[#F8F9FA]"
                data-testid="intake-csv-textarea"
                required
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00F0FF] px-5 py-2.5 text-xs font-bold text-[#0B0B14] shadow-lg hover:opacity-90"
              data-testid="submit-intake-import-btn"
            >
              <Upload className="h-4 w-4" />
              <span>Import Rows to Verification Queue (needs_verification)</span>
            </button>
          </form>

          {intakeBatches.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A0A3BD]">
                Recent Update-Intake Batches ({intakeBatches.length})
              </h3>
              <div className="mt-2 space-y-2">
                {intakeBatches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0B0B14] px-3.5 py-2 text-xs"
                  >
                    <span className="font-bold text-[#F8F9FA]">
                      {b.source} ({b.intakeDate})
                    </span>
                    <span className="text-[#FFB800]">
                      {b.rowsImported} row(s) → needs_verification ({b.rowIds.join(", ")})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Claims Queue */}
      {activeTab === "claims" && (
        <div className="mt-6 space-y-3" data-testid="admin-claims-list">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#1E1E34] p-5 sm:flex-row sm:items-center"
              data-testid="admin-claim-item"
            >
              <div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    claim.status === "approved"
                      ? "bg-[#00E676]/20 text-[#00E676]"
                      : "bg-[#FFB800]/20 text-[#FFB800]"
                  }`}
                >
                  {claim.status}
                </span>
                <h3 className="font-display mt-1.5 text-lg font-bold text-[#F8F9FA]">
                  {claim.targetName} ({claim.targetType})
                </h3>
                <p className="text-xs text-[#A0A3BD]">
                  Claimant: <strong>{claim.claimantName}</strong> (
                  {claim.claimantEmail} • {claim.claimantRole})
                </p>
                <p className="mt-1 text-xs text-[#00F0FF]">
                  Asserted Primary Genre: <strong>{claim.assertedPrimaryGenre}</strong>{" "}
                  • Also Welcome: <strong>{claim.assertedAlsoWelcome}</strong> • Not a Fit:{" "}
                  <strong>{claim.assertedNotAFit}</strong>
                </p>
                <a
                  href={claim.socialOrWebProof}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-[#FF2E93] underline"
                >
                  <span>Proof: {claim.socialOrWebProof}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {claim.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleClaimDecision(claim.id, "approved")}
                    className="rounded-xl bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14]"
                    data-testid="approve-claim-btn"
                  >
                    Approve &amp; Stamp last_confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClaimDecision(claim.id, "rejected")}
                    className="rounded-xl border border-white/15 bg-[#151525] px-3 py-2 text-xs text-rose-400"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Community Corrections Queue */}
      {activeTab === "corrections" && (
        <div className="mt-6 space-y-3" data-testid="admin-corrections-list">
          {corrections.map((corr) => (
            <div
              key={corr.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#1E1E34] p-5 sm:flex-row sm:items-center"
              data-testid="admin-correction-item"
            >
              <div>
                <span className="rounded-full bg-[#00F0FF]/20 px-2.5 py-0.5 text-xs font-bold uppercase text-[#00F0FF]">
                  {corr.status} • {corr.submitterRole}
                </span>
                <h3 className="font-display mt-1.5 text-lg font-bold text-[#F8F9FA]">
                  {corr.venueName} — Update <code>{corr.fieldName}</code> to{" "}
                  <span className="text-[#00E676]">&ldquo;{corr.proposedValue}&rdquo;</span>
                </h3>
                <p className="mt-1 text-xs text-[#A0A3BD]">
                  Basis / Evidence: {corr.sourceOrBasis}
                </p>
              </div>

              {corr.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCorrectionDecision(corr.id, "approved")
                    }
                    className="rounded-xl bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14]"
                    data-testid="approve-correction-btn"
                  >
                    Apply Update to Listing
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCorrectionDecision(corr.id, "rejected")
                    }
                    className="rounded-xl border border-white/15 bg-[#151525] px-3 py-2 text-xs text-rose-400"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Freshness & Stale Re-Verification Dashboard (45d / 90d) */}
      {activeTab === "stale" && (
        <div className="mt-6 space-y-6" data-testid="admin-freshness-dashboard">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Clock className="h-5 w-5 text-[#FFB800]" />
              <span>
                Freshness Verification Simulator (45-Day Badge &amp; 90-Day Auto-Archive)
              </span>
            </h2>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Per acceptance check #7/#8: Setting a test night&apos;s{" "}
              <code>last_confirmed</code> to <strong>46 days</strong> shows the{" "}
              <code>Call to confirm</code> badge on the public map; setting it to{" "}
              <strong>91 days</strong> removes it from the public map while keeping it here in Admin.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleSetFreshnessDays("night-1", 46)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFB800] px-4 py-2 text-xs font-bold text-[#0B0B14]"
                data-testid="set-freshness-46d-btn"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Set Corky&apos;s Place (Monday) to 46 Days Ago</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetFreshnessDays("night-1", 91)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white"
                data-testid="set-freshness-91d-btn"
              >
                <Archive className="h-4 w-4" />
                <span>Set Corky&apos;s Place (Monday) to 91 Days Ago</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetFreshnessDays("night-1", 0)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14]"
                data-testid="reverify-today-btn"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Re-Verify Corky&apos;s Place Today (0 Days)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#FFB800]/40 bg-[#151525] p-6">
              <h3 className="font-display text-lg font-bold text-[#FFB800]">
                45–89 Days Unconfirmed ({staleWarning.length})
              </h3>
              <p className="text-xs text-[#A0A3BD]">
                Publicly visible with amber &ldquo;Call to confirm&rdquo; badge.
              </p>
              <div className="mt-4 space-y-2">
                {staleWarning.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl bg-[#0B0B14] p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#F8F9FA]">
                        {n.venueName} ({n.dayOfWeek})
                      </span>
                      <span className="ml-2 text-[#FFB800]">
                        {n.daysSinceConfirmed}d unconfirmed
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetFreshnessDays(n.id, 0)}
                      className="rounded-lg bg-[#00E676] px-2.5 py-1 font-bold text-[#0B0B14]"
                    >
                      Re-Verify Today
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-500/40 bg-[#151525] p-6">
              <h3 className="font-display text-lg font-bold text-rose-400">
                &ge;90 Days Unconfirmed — Auto-Hidden from Public ({expired90d.length})
              </h3>
              <p className="text-xs text-[#A0A3BD]">
                Removed from public discovery until re-verified by Admin or KJ.
              </p>
              <div className="mt-4 space-y-2" data-testid="expired-90d-list">
                {expired90d.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl bg-[#0B0B14] p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#F8F9FA]">
                        {n.venueName} ({n.dayOfWeek})
                      </span>
                      <span className="ml-2 text-rose-400">
                        {n.daysSinceConfirmed}d unconfirmed
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetFreshnessDays(n.id, 0)}
                      className="rounded-lg bg-[#00E676] px-2.5 py-1 font-bold text-[#0B0B14]"
                    >
                      Restore &amp; Re-Verify
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: UGC Moderation */}
      {activeTab === "moderation" && (
        <div className="mt-6 space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1E1E34] p-4 text-xs"
            >
              <div>
                <span className="font-bold text-[#F8F9FA]">
                  {rep.targetLabel} ({rep.targetType})
                </span>
                <p className="text-[#A0A3BD]">Reason: {rep.reason}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 font-bold uppercase text-[#00F0FF]">
                {rep.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
