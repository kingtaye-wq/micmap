"use client";

import React, { useState } from "react";
import {
  CorrectionModal,
  ClaimModal,
} from "@/components/CorrectionAndClaimModals";
import {
  CheckCircle2,
  Flag,
  MapPinCheck,
  BellPlus,
  Edit3,
  ShieldCheck,
} from "lucide-react";

interface NightAndVenueActionsProps {
  nightId: string;
  venueSlug: string;
  venueName: string;
  roomCode: string;
  hostSlug?: string | null;
  hostName?: string;
}

export function NightAndVenueActions({
  nightId,
  venueName,
  roomCode,
  hostSlug,
  hostName,
}: NightAndVenueActionsProps) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [reported, setReported] = useState(false);

  async function handleFollow() {
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followerEmail: "fan@micmap.co",
        targetType: hostSlug ? "person" : "venue",
        targetSlug: hostSlug || venueName.toLowerCase().replace(/\s+/g, "-"),
        targetName: hostName || venueName,
        smsOptIn: true,
      }),
    });
    setFollowed(true);
  }

  async function handleReport() {
    await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "night",
        targetId: nightId,
        targetLabel: venueName,
        reason: "Flagged for schedule or genre review",
      }),
    });
    setReported(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => setCheckedIn(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14] shadow-md transition hover:opacity-90"
        data-testid="checkin-btn"
      >
        <MapPinCheck className="h-4 w-4" />
        <span>
          {checkedIn
            ? `Checked In (${roomCode} Active)`
            : `Check In Here (${roomCode})`}
        </span>
      </button>

      <button
        type="button"
        onClick={handleFollow}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF2E93] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:opacity-90"
        data-testid="follow-btn"
      >
        <BellPlus className="h-4 w-4" />
        <span>
          {followed
            ? "Following (Tonight Alerts On)"
            : `Follow ${hostName && hostName !== "UNKNOWN" ? hostName : venueName}`}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setIsCorrectionOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2 text-xs font-bold text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
        data-testid="open-correction-modal-btn"
      >
        <Edit3 className="h-4 w-4" />
        <span>Pending Verification? Submit an Update</span>
      </button>

      <button
        type="button"
        onClick={() => setIsClaimOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#151525] px-4 py-2 text-xs font-semibold text-[#F8F9FA] transition hover:border-[#FF2E93]"
        data-testid="open-claim-modal-btn"
      >
        <ShieldCheck className="h-4 w-4 text-[#FF2E93]" />
        <span>Claim This Venue / Host Profile</span>
      </button>

      <button
        type="button"
        onClick={handleReport}
        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B0B14] px-3 py-2 text-xs text-[#A0A3BD] hover:text-rose-400"
        data-testid="report-ugc-btn"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>{reported ? "Reported to Moderation" : "Report"}</span>
      </button>

      {checkedIn && (
        <div
          className="w-full rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-3 text-xs text-[#00E676]"
          data-testid="checkin-active-banner"
        >
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Check-In Verified for Room {roomCode}! QR Song Request &amp; 5%-Fee Tip Page Activated.
            </span>
          </div>
        </div>
      )}

      <CorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        nightId={nightId}
        venueName={venueName}
      />

      <ClaimModal
        isOpen={isClaimOpen}
        onClose={() => setIsClaimOpen(false)}
        targetType="night"
        targetId={nightId}
        targetName={venueName}
      />
    </div>
  );
}
