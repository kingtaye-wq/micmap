"use client";

import React, { useState } from "react";
import {
  calculateTipBreakdown,
  KJ_PAYOUT_MINIMUM_CENTS,
  TIP_PLATFORM_FEE_BPS,
} from "@/config/brand";
import {
  HeartHandshake,
  BellRing,
  CheckCircle2,
  Send,
  DollarSign,
} from "lucide-react";

interface HostTipAndFollowBoxProps {
  recipientType?: "kj" | "artist" | "crew";
  recipientSlug: string;
  recipientName: string;
  roomCode: string;
  initialFollowerCount: number;
  initialBalanceCents: number;
}

export function HostTipAndFollowBox({
  recipientType = "kj",
  recipientSlug,
  recipientName,
  roomCode,
  initialFollowerCount,
  initialBalanceCents,
}: HostTipAndFollowBoxProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followerEmail, setFollowerEmail] = useState("");
  const [followed, setFollowed] = useState(false);

  const [tipDollars, setTipDollars] = useState<number>(10);
  const [tipperName, setTipperName] = useState("");
  const [balanceCents, setBalanceCents] = useState(initialBalanceCents);
  const [lastTipResult, setLastTipResult] = useState<{
    grossDollars: string;
    platformFeeDollars: string;
    netKjDollars: string;
    payoutStatusLabel: string;
  } | null>(null);

  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingSent, setBookingSent] = useState(false);

  const previewBreakdown = calculateTipBreakdown(Math.round(tipDollars * 100));

  async function handleFollow(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followerEmail: followerEmail || "fan@micmap.co",
        targetType: recipientType === "crew" ? "crew" : "person",
        targetSlug: recipientSlug,
        targetName: recipientName,
        smsOptIn: true,
      }),
    });
    setFollowerCount((c) => c + 1);
    setFollowed(true);
  }

  async function handleSendTip(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientType,
        recipientSlug,
        recipientName,
        roomCode,
        tipperName: tipperName || "Cleveland Supporter",
        grossCents: Math.round(tipDollars * 100),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setBalanceCents(data.hostBalanceCents);
      setLastTipResult({
        grossDollars: data.breakdown.grossDollars,
        platformFeeDollars: data.breakdown.platformFeeDollars,
        netKjDollars: data.breakdown.netKjDollars,
        payoutStatusLabel: data.payoutEvaluation.statusLabel,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Follow + Tonight Alerts Card */}
      <div className="rounded-2xl border border-white/10 bg-[#151525] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[#F8F9FA]">
            Follow for Tonight Alerts
          </h3>
          <span
            className="rounded-full bg-[#00F0FF]/15 px-2.5 py-0.5 text-xs font-bold text-[#00F0FF]"
            data-testid="host-follower-count"
          >
            {followerCount} Followers
          </span>
        </div>
        <p className="mt-1 text-xs text-[#A0A3BD]">
          Get notified when {recipientName} goes live at their Cleveland venues.
        </p>

        {followed ? (
          <div
            className="mt-3 flex items-center gap-2 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-3 text-xs font-bold text-[#00E676]"
            data-testid="follow-confirmation-banner"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Following! Notification event queued in notification_events.</span>
          </div>
        ) : (
          <form onSubmit={handleFollow} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={followerEmail}
              onChange={(e) => setFollowerEmail(e.target.value)}
              placeholder="Enter email for tonight alerts..."
              className="flex-1 rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
              data-testid="follow-email-input"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-[#00F0FF] px-4 py-2 text-xs font-bold text-[#0B0B14]"
              data-testid="follow-submit-btn"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>Follow</span>
            </button>
          </form>
        )}
      </div>

      {/* Stripe Connect Test-Mode Tip Box (5% Platform Fee, $25 Batch Minimum) */}
      <div className="rounded-2xl border border-[#FF2E93]/40 bg-[#151525] p-5 shadow-[0_0_25px_rgba(255,46,147,0.12)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display flex items-center gap-1.5 text-base font-bold text-[#F8F9FA]">
            <HeartHandshake className="h-4 w-4 text-[#FF2E93]" />
            <span>Tip {recipientName} (Stripe Connect Test Mode)</span>
          </h3>
          <span className="font-mono-code rounded-md bg-[#FF2E93]/20 px-2 py-0.5 text-[11px] font-bold text-[#FF2E93]">
            {TIP_PLATFORM_FEE_BPS / 100}% Platform Fee
          </span>
        </div>

        <form onSubmit={handleSendTip} className="mt-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 30].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTipDollars(amt)}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  tipDollars === amt
                    ? "bg-[#FF2E93] text-white"
                    : "border border-white/10 bg-[#0B0B14] text-[#A0A3BD] hover:text-white"
                }`}
                data-testid={`tip-preset-${amt}`}
              >
                ${amt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-[#A0A3BD]">
                Custom Amount ($)
              </label>
              <div className="relative mt-1">
                <DollarSign className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#A0A3BD]" />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={tipDollars}
                  onChange={(e) => setTipDollars(Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-white/15 bg-[#0B0B14] py-2 pl-8 pr-3 text-xs text-[#F8F9FA]"
                  data-testid="tip-custom-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#A0A3BD]">
                Your Name / Song Dedication
              </label>
              <input
                type="text"
                value={tipperName}
                onChange={(e) => setTipperName(e.target.value)}
                placeholder="e.g., Jordan V."
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-xs text-[#F8F9FA]"
                data-testid="tipper-name-input"
              />
            </div>
          </div>

          {/* Transparent 5% Fee Breakdown */}
          <div
            className="rounded-xl border border-white/10 bg-[#0B0B14] p-3 text-xs"
            data-testid="tip-fee-breakdown"
          >
            <div className="flex justify-between text-[#A0A3BD]">
              <span>Gross Tip:</span>
              <span className="font-mono-code text-[#F8F9FA]">
                ${previewBreakdown.grossDollars}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[#A0A3BD]">
              <span>Platform Fee (5% / 500 bps):</span>
              <span
                className="font-mono-code text-[#FFB800]"
                data-testid="tip-platform-fee-dollars"
              >
                ${previewBreakdown.platformFeeDollars}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-white/10 pt-1 font-bold text-[#00E676]">
              <span>Net to {recipientName}:</span>
              <span
                className="font-mono-code"
                data-testid="tip-net-kj-dollars"
              >
                ${previewBreakdown.netKjDollars}
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-[#A0A3BD]">
              Stripe Connect payouts batch monthly once available balance reaches the ${(KJ_PAYOUT_MINIMUM_CENTS / 100).toFixed(2)} minimum threshold. Current host balance:{" "}
              <strong className="text-[#F8F9FA]">
                ${(balanceCents / 100).toFixed(2)}
              </strong>
              .
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] py-2.5 text-xs font-bold text-[#0B0B14] shadow-lg"
            data-testid="submit-tip-btn"
          >
            + Send ${previewBreakdown.grossDollars} Tip (Test Mode)
          </button>
        </form>

        {lastTipResult && (
          <div
            className="mt-3 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-3 text-xs text-[#00E676]"
            data-testid="tip-receipt-banner"
          >
            <p className="font-bold">
              Tip Recorded! Gross ${lastTipResult.grossDollars} • Fee $
              {lastTipResult.platformFeeDollars} (5%) • Net $
              {lastTipResult.netKjDollars}
            </p>
            <p className="mt-0.5 text-[11px] text-[#F8F9FA]">
              Payout Batch Status: <strong>{lastTipResult.payoutStatusLabel}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Booking & Message Host Form */}
      <div className="rounded-2xl border border-white/10 bg-[#151525] p-5">
        <h3 className="font-display text-base font-bold text-[#F8F9FA]">
          Book or Message {recipientName}
        </h3>
        <p className="mt-1 text-xs text-[#A0A3BD]">
          Guest KJ nights, private events, or venue residency inquiries.
        </p>

        {bookingSent ? (
          <p className="mt-3 rounded-xl bg-[#00E676]/15 p-3 text-xs font-bold text-[#00E676]">
            Inquiry queued for {recipientName}!
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBookingSent(true);
            }}
            className="mt-3 space-y-2"
          >
            <textarea
              rows={2}
              required
              value={bookingMessage}
              onChange={(e) => setBookingMessage(e.target.value)}
              placeholder={`Message ${recipientName} about booking or songbook requests...`}
              className="w-full rounded-xl border border-white/15 bg-[#0B0B14] p-3 text-xs text-[#F8F9FA]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#1E1E34] px-4 py-2 text-xs font-bold text-[#F8F9FA] hover:border-[#00F0FF]"
            >
              <Send className="h-3.5 w-3.5 text-[#00F0FF]" />
              <span>Message Host</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
