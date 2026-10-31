"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  APP_NAME,
  calculateTipBreakdown,
  evaluatePayoutStatus,
  KJ_PAYOUT_MINIMUM_CENTS,
  TIP_PLATFORM_FEE_BPS,
} from "@/config/brand";
import {
  Radio,
  Printer,
  CheckCircle2,
  Play,
  SkipForward,
  UserPlus,
  DollarSign,
  PauseCircle,
} from "lucide-react";

interface SongItem {
  id: string;
  roomCode: string;
  venueName: string;
  singerStageName: string;
  songTitle: string;
  artistName: string;
  notesKeyChange: string;
  tipBoostCents: number;
  platformFeeCents: number;
  netKjCents: number;
  status: "queued" | "up_next" | "now_singing" | "completed" | "skipped";
}

interface TipItem {
  id: string;
  recipientSlug: string;
  recipientName: string;
  roomCode: string;
  tipperName: string;
  grossCents: number;
  platformFeeCents: number;
  netKjCents: number;
  payoutStatus: string;
}

export default function KjConsolePage() {
  const [roomCode, setRoomCode] = useState("CLE-018");
  const [requests, setRequests] = useState<SongItem[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [walkUpName, setWalkUpName] = useState("");
  const [walkUpSong, setWalkUpSong] = useState("");
  const [walkUpArtist, setWalkUpArtist] = useState("");
  const [walkUpTipDollars, setWalkUpTipDollars] = useState<number>(10);
  const [requestsPaused, setRequestsPaused] = useState(false);

  async function refreshData() {
    const res = await fetch("/api/room/requests");
    const data = await res.json();
    if (Array.isArray(data.songRequests)) setRequests(data.songRequests);
    if (Array.isArray(data.tips)) setTips(data.tips);
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function updateStatus(
    requestId: string,
    status: SongItem["status"]
  ) {
    await fetch("/api/room/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    await refreshData();
  }

  async function handleAddWalkUp(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/room/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        singerStageName: walkUpName,
        songTitle: walkUpSong,
        artistName: walkUpArtist,
        tipBoostCents: Math.round(walkUpTipDollars * 100),
      }),
    });
    setWalkUpName("");
    setWalkUpSong("");
    setWalkUpArtist("");
    await refreshData();
  }

  // Filter tips for active KJ (KJ Meshell default) to show $25 payout threshold clearly
  const meshellTips = tips.filter(
    (t) => t.recipientSlug === "shell-yeah-events-by-meshell"
  );
  const grossCents = meshellTips.reduce((s, t) => s + t.grossCents, 0);
  const feeCents = meshellTips.reduce((s, t) => s + t.platformFeeCents, 0);
  const netCents = meshellTips.reduce((s, t) => s + t.netKjCents, 0);
  const payoutEval = evaluatePayoutStatus(netCents);
  const sampleTenBreakdown = calculateTipBreakdown(1000);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Console Header */}
      <div className="rounded-3xl border border-[#00F0FF]/40 bg-[#151525] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#00F0FF]">
              <Radio className="h-4 w-4 text-[#00E676]" />
              <span>{APP_NAME} • Live KJ Stage Console &amp; Tip Ledger</span>
            </div>
            <h1 className="font-display mt-1 text-2xl font-bold text-[#F8F9FA] sm:text-4xl">
              KJ Control Console — Room{" "}
              <span className="font-mono-code text-[#FF2E93]">{roomCode}</span>
            </h1>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Active Host: KJ Meshell (Shell Yeah Events by MeShell) • Time Warp Bar (Westlake)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setRequestsPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0B0B14] px-4 py-2 text-xs font-bold text-[#F8F9FA]"
            >
              <PauseCircle className="h-4 w-4 text-[#FFB800]" />
              <span>
                {requestsPaused ? "Resume Requests" : "Pause Requests"}
              </span>
            </button>

            <Link
              href={`/kj/poster/${roomCode}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#FFB800] px-4 py-2 text-xs font-bold text-[#0B0B14] shadow-lg"
              data-testid="kj-console-poster-btn"
            >
              <Printer className="h-4 w-4" />
              <span>Printable Table-Tent / QR Poster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Live Singer Rotation Controls */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#F8F9FA]">
                Live Singer Queue ({requests.length})
              </h2>
              <select
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="font-mono-code rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-1.5 text-xs text-[#00F0FF]"
              >
                <option value="CLE-018">CLE-018 (Time Warp Bar)</option>
                <option value="CLE-001">CLE-001 (Corky&apos;s Place)</option>
                <option value="CLE-072">CLE-072 (B Side Lounge)</option>
              </select>
            </div>

            <div className="mt-4 space-y-3" data-testid="kj-console-queue-list">
              {requests.map((req, index) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-white/10 bg-[#1E1E34] p-4"
                  data-testid="kj-console-queue-item"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code rounded bg-[#0B0B14] px-2 py-0.5 text-xs text-[#00F0FF]">
                          #{index + 1} • {req.roomCode}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            req.status === "now_singing"
                              ? "bg-[#00E676]/20 text-[#00E676]"
                              : req.status === "completed"
                              ? "bg-white/10 text-[#A0A3BD]"
                              : "bg-[#FF2E93]/20 text-[#FF2E93]"
                          }`}
                        >
                          {req.status.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="font-display mt-1.5 text-lg font-bold text-[#F8F9FA]">
                        {req.singerStageName} — &ldquo;{req.songTitle}&rdquo;
                      </h3>
                      <p className="text-xs text-[#A0A3BD]">
                        Artist: {req.artistName} • Notes: {req.notesKeyChange}
                      </p>
                    </div>

                    {req.tipBoostCents > 0 && (
                      <div className="rounded-xl border border-[#00E676]/40 bg-[#0B0B14] px-3 py-1.5 text-right text-xs">
                        <span className="block font-bold text-[#00E676]">
                          Tip: ${(req.tipBoostCents / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#A0A3BD]">
                          5% Fee: ${(req.platformFeeCents / 100).toFixed(2)} • Net: $
                          {(req.netKjCents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => updateStatus(req.id, "now_singing")}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#00E676] px-3 py-1.5 font-bold text-[#0B0B14]"
                    >
                      <Play className="h-3 w-3" />
                      <span>Call to Stage / Now Singing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(req.id, "completed")}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#151525] px-3 py-1.5 font-semibold text-[#F8F9FA]"
                    >
                      <CheckCircle2 className="h-3 w-3 text-[#00F0FF]" />
                      <span>Mark Completed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(req.id, "skipped")}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0B0B14] px-3 py-1.5 text-[#A0A3BD]"
                    >
                      <SkipForward className="h-3 w-3" />
                      <span>Bump / Skip</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Walk-Up Singer + Test Tip Form */}
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h3 className="font-display flex items-center gap-2 text-lg font-bold text-[#F8F9FA]">
              <UserPlus className="h-5 w-5 text-[#00F0FF]" />
              <span>Add Walk-Up Singer / Record Test Tip</span>
            </h3>
            <form
              onSubmit={handleAddWalkUp}
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4"
            >
              <input
                type="text"
                required
                value={walkUpName}
                onChange={(e) => setWalkUpName(e.target.value)}
                placeholder="Singer Name"
                className="rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
                data-testid="walkup-name-input"
              />
              <input
                type="text"
                required
                value={walkUpSong}
                onChange={(e) => setWalkUpSong(e.target.value)}
                placeholder="Song Title"
                className="rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
                data-testid="walkup-song-input"
              />
              <input
                type="text"
                required
                value={walkUpArtist}
                onChange={(e) => setWalkUpArtist(e.target.value)}
                placeholder="Artist"
                className="rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
                data-testid="walkup-artist-input"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={walkUpTipDollars}
                  onChange={(e) => setWalkUpTipDollars(Number(e.target.value))}
                  className="w-20 rounded-xl border border-white/15 bg-[#0B0B14] px-2 py-2 text-xs text-[#F8F9FA]"
                  data-testid="walkup-tip-input"
                />
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#FF2E93] px-3 py-2 text-xs font-bold text-white"
                  data-testid="walkup-submit-btn"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Tip Boost Ledger (5% Platform Fee & $25.00 Payout Minimum) */}
        <div className="space-y-6 lg:col-span-5">
          <div
            className="rounded-3xl border border-[#00E676]/40 bg-[#151525] p-6"
            data-testid="kj-tip-ledger"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-1.5 text-xl font-bold text-[#F8F9FA]">
                <DollarSign className="h-5 w-5 text-[#00E676]" />
                <span>Tip Boost Ledger &amp; Payout Threshold</span>
              </h2>
              <span className="font-mono-code rounded-md bg-[#00F0FF]/15 px-2 py-0.5 text-xs font-bold text-[#00F0FF]">
                {TIP_PLATFORM_FEE_BPS / 100}% Fee
              </span>
            </div>

            {/* Money Math Reference Box ($10 tip = $0.50 fee) */}
            <div
              className="mt-3 rounded-xl border border-white/10 bg-[#0B0B14] p-3 text-xs text-[#A0A3BD]"
              data-testid="reference-ten-dollar-math"
            >
              Locked Fee Math: A{" "}
              <strong className="text-[#F8F9FA]">
                ${sampleTenBreakdown.grossDollars}
              </strong>{" "}
              tip records a{" "}
              <strong className="text-[#FFB800]">
                ${sampleTenBreakdown.platformFeeDollars}
              </strong>{" "}
              platform fee (5%) and{" "}
              <strong className="text-[#00E676]">
                ${sampleTenBreakdown.netKjDollars}
              </strong>{" "}
              net to the KJ.
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3">
                <span className="block text-[10px] uppercase text-[#A0A3BD]">
                  Gross Tips
                </span>
                <span
                  className="font-mono-code mt-1 block text-lg font-bold text-[#F8F9FA]"
                  data-testid="ledger-gross-dollars"
                >
                  ${(grossCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-3">
                <span className="block text-[10px] uppercase text-[#A0A3BD]">
                  5% Platform Fee
                </span>
                <span
                  className="font-mono-code mt-1 block text-lg font-bold text-[#FFB800]"
                  data-testid="ledger-fee-dollars"
                >
                  ${(feeCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="rounded-2xl border border-[#00E676]/30 bg-[#0B0B14] p-3">
                <span className="block text-[10px] uppercase text-[#A0A3BD]">
                  Net KJ Earnings
                </span>
                <span
                  className="font-mono-code mt-1 block text-lg font-bold text-[#00E676]"
                  data-testid="ledger-net-dollars"
                >
                  ${(netCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* $25.00 Minimum Payout Threshold Tracker */}
            <div
              className="mt-4 rounded-2xl border border-white/15 bg-[#1E1E34] p-4"
              data-testid="payout-threshold-card"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#A0A3BD]">
                  Monthly Batch Minimum ($
                  {(KJ_PAYOUT_MINIMUM_CENTS / 100).toFixed(2)}):
                </span>
                <span
                  className={`font-bold ${
                    payoutEval.eligible ? "text-[#00E676]" : "text-[#FFB800]"
                  }`}
                  data-testid="payout-status-label"
                >
                  {payoutEval.statusLabel}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#0B0B14]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF2E93] to-[#00E676]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((netCents / KJ_PAYOUT_MINIMUM_CENTS) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Recent Tips List */}
            <div className="mt-4 space-y-2">
              {meshellTips.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0B14] px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#F8F9FA]">
                      {t.tipperName}
                    </span>
                    <span className="ml-2 text-[#A0A3BD]">({t.roomCode})</span>
                  </div>
                  <div className="font-mono-code text-right">
                    <span className="text-[#F8F9FA]">
                      ${(t.grossCents / 100).toFixed(2)}
                    </span>{" "}
                    <span className="text-[#FFB800]">
                      (-${(t.platformFeeCents / 100).toFixed(2)} fee)
                    </span>{" "}
                    <span className="font-bold text-[#00E676]">
                      = ${(t.netKjCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
