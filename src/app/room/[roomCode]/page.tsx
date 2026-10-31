"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  APP_NAME,
  calculateTipBreakdown,
  TIP_PLATFORM_FEE_BPS,
} from "@/config/brand";
import {
  Radio,
  Mic,
  Sparkles,
  CheckCircle2,
  Bell,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

interface QueueItem {
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

export default function SingerLiveRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = (params?.roomCode || "CLE-018").toUpperCase();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [singerStageName, setSingerStageName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [notesKeyChange, setNotesKeyChange] = useState("Standard key");
  const [tipDollars, setTipDollars] = useState<number>(10);
  const [notifyContact, setNotifyContact] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState<QueueItem | null>(
    null
  );

  const tipBreakdown = calculateTipBreakdown(Math.round(tipDollars * 100));

  async function loadQueue() {
    const res = await fetch(`/api/room/requests?roomCode=${roomCode}`);
    const data = await res.json();
    if (Array.isArray(data.songRequests)) {
      setQueue(data.songRequests);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [roomCode]);

  async function handleSubmitSong(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/room/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        singerStageName,
        songTitle,
        artistName,
        notesKeyChange,
        tipBoostCents: Math.round(tipDollars * 100),
        notifyContact,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setSubmittedRequest(data.songRequest);
      setSingerStageName("");
      setSongTitle("");
      setArtistName("");
      await loadQueue();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Live Room Header */}
      <div className="rounded-3xl border border-[#FF2E93]/40 bg-gradient-to-br from-[#151525] via-[#1E1E34] to-[#0B0B14] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-3 py-1 text-xs font-bold text-[#00E676]">
              <Radio className="h-3.5 w-3.5" />
              <span>Instant Web Room • No App Download Required</span>
            </div>
            <h1 className="font-display mt-2 text-2xl font-bold text-[#F8F9FA] sm:text-4xl">
              {APP_NAME} Live Singer Room{" "}
              <span
                className="font-mono-code text-[#00F0FF]"
                data-testid="live-room-code"
              >
                {roomCode}
              </span>
            </h1>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Submit your song to the stage queue and optionally tip the KJ via Stripe Connect (5% platform fee).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kj/console"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2 text-xs font-bold text-[#00F0FF]"
            >
              <span>View in KJ Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Song Request + Optional Tip Boost Form */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Mic className="h-5 w-5 text-[#FF2E93]" />
              <span>Request Your Song &amp; Tip the KJ</span>
            </h2>

            {submittedRequest && (
              <div
                className="mt-4 rounded-2xl border border-[#00E676]/40 bg-[#00E676]/10 p-4 text-xs text-[#00E676]"
                data-testid="song-request-confirmation"
              >
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Song Request Added to Live Queue for{" "}
                    {submittedRequest.singerStageName}!
                  </span>
                </div>
                <p className="mt-1 text-[#F8F9FA]">
                  Song: &ldquo;{submittedRequest.songTitle}&rdquo; by{" "}
                  {submittedRequest.artistName}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitSong} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Singer Stage Name
                </label>
                <input
                  type="text"
                  required
                  value={singerStageName}
                  onChange={(e) => setSingerStageName(e.target.value)}
                  placeholder="e.g., Alex R. or Kendra V."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2.5 text-sm text-[#F8F9FA]"
                  data-testid="singer-name-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Song Title
                  </label>
                  <input
                    type="text"
                    required
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="e.g., Purple Rain"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2.5 text-sm text-[#F8F9FA]"
                    data-testid="song-title-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Original Artist
                  </label>
                  <input
                    type="text"
                    required
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="e.g., Prince"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2.5 text-sm text-[#F8F9FA]"
                    data-testid="song-artist-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Key Change / Stage Notes
                  </label>
                  <input
                    type="text"
                    value={notesKeyChange}
                    onChange={(e) => setNotesKeyChange(e.target.value)}
                    placeholder="Standard key / -1 semitone"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3.5 py-2.5 text-sm text-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    2-Spots-Away Alert (SMS / Email Optional)
                  </label>
                  <div className="relative mt-1">
                    <Bell className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#00F0FF]" />
                    <input
                      type="text"
                      value={notifyContact}
                      onChange={(e) => setNotifyContact(e.target.value)}
                      placeholder="Phone or email for 'Up Next' ping"
                      className="w-full rounded-xl border border-white/15 bg-[#0B0B14] py-2.5 pl-9 pr-3 text-sm text-[#F8F9FA]"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Priority Tip Boost with 5% Platform Fee Breakdown */}
              <div className="rounded-2xl border border-[#FF2E93]/40 bg-[#0B0B14] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#FF2E93]">
                    <HeartHandshake className="h-4 w-4" />
                    <span>Optional KJ Tip Boost (Stripe Connect Test Mode)</span>
                  </span>
                  <span className="font-mono-code text-[11px] text-[#00F0FF]">
                    {TIP_PLATFORM_FEE_BPS / 100}% Platform Fee
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[0, 5, 10, 20, 30].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTipDollars(amt)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        tipDollars === amt
                          ? "bg-[#FF2E93] text-white"
                          : "border border-white/10 bg-[#151525] text-[#A0A3BD]"
                      }`}
                      data-testid={`room-tip-btn-${amt}`}
                    >
                      {amt === 0 ? "No Tip" : `$${amt}`}
                    </button>
                  ))}
                </div>

                {tipDollars > 0 && (
                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#151525] px-3 py-2 text-xs"
                    data-testid="room-tip-breakdown"
                  >
                    <span>
                      Gross: <strong>${tipBreakdown.grossDollars}</strong>
                    </span>
                    <span className="text-[#FFB800]">
                      5% Fee: <strong>${tipBreakdown.platformFeeDollars}</strong>
                    </span>
                    <span className="text-[#00E676]">
                      Net to KJ: <strong>${tipBreakdown.netKjDollars}</strong>
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] py-3 text-sm font-bold text-[#0B0B14] shadow-lg"
                data-testid="submit-song-request-btn"
              >
                Submit Song to Live Queue
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Up Next / Now Singing Queue */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
                <Sparkles className="h-5 w-5 text-[#00F0FF]" />
                <span>Live Stage Rotation ({queue.length})</span>
              </h2>
              <span className="font-mono-code text-xs text-[#00E676]">
                LIVE
              </span>
            </div>

            <div className="mt-4 space-y-3" data-testid="live-room-queue-list">
              {queue.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#1E1E34] p-4"
                  data-testid="live-room-queue-item"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-code text-xs text-[#A0A3BD]">
                      #{idx + 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === "now_singing"
                          ? "bg-[#00E676]/20 text-[#00E676]"
                          : item.status === "up_next"
                          ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                          : "bg-[#FF2E93]/20 text-[#FF2E93]"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-display mt-1 text-base font-bold text-[#F8F9FA]">
                    {item.singerStageName}
                  </h3>
                  <p className="text-xs text-[#00F0FF]">
                    &ldquo;{item.songTitle}&rdquo; — {item.artistName}
                  </p>
                  {item.tipBoostCents > 0 && (
                    <p className="mt-1 text-[11px] text-[#00E676]">
                      +${(item.tipBoostCents / 100).toFixed(2)} Tip Boost (5% fee: $
                      {(item.platformFeeCents / 100).toFixed(2)})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
