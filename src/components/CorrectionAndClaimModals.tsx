"use client";

import React, { useState } from "react";
import { GENRE_TAXONOMY } from "@/config/brand";
import { X, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nightId: string;
  venueName: string;
  defaultField?:
    | "primaryGenre"
    | "alsoWelcome"
    | "notAFit"
    | "startTime"
    | "dayOfWeek"
    | "hostOrKj"
    | "signupMethod";
}

export function CorrectionModal({
  isOpen,
  onClose,
  nightId,
  venueName,
  defaultField = "primaryGenre",
}: CorrectionModalProps) {
  const [fieldName, setFieldName] = useState(defaultField);
  const [proposedValue, setProposedValue] = useState("");
  const [sourceOrBasis, setSourceOrBasis] = useState("");
  const [submitterRole, setSubmitterRole] = useState<
    "crowd_report" | "kj" | "venue"
  >("crowd_report");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nightId,
          venueName,
          fieldName,
          proposedValue,
          sourceOrBasis,
          submitterRole,
        }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      data-testid="correction-modal"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#00F0FF]/40 bg-[#151525] p-6 text-[#F8F9FA] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#A0A3BD] hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00F0FF]">
          <Sparkles className="h-4 w-4" />
          <span>Honest Data Engine • Community / Host Update</span>
        </div>

        <h3 className="font-display text-xl font-bold">
          Submit a Verified Update for {venueName}
        </h3>
        <p className="mt-1 text-xs text-[#A0A3BD]">
          We never guess or fabricate unknown fields. Submit your firsthand knowledge or source link below for admin verification.
        </p>

        {submitted ? (
          <div
            className="mt-6 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-4 text-sm text-[#00E676]"
            data-testid="correction-success-message"
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              <span>Update queued for verification!</span>
            </div>
            <p className="mt-1 text-xs text-[#F8F9FA]/90">
              Your correction is now in the Admin Corrections Queue. Nothing public changes until verified.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 rounded-lg bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                Field to Update
              </label>
              <select
                value={fieldName}
                onChange={(e) =>
                  setFieldName(e.target.value as typeof defaultField)
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                data-testid="correction-field-select"
              >
                <option value="primaryGenre">Primary Genre Fit</option>
                <option value="alsoWelcome">Also Welcome Genres</option>
                <option value="notAFit">Not a Fit Genres</option>
                <option value="startTime">Start Time</option>
                <option value="dayOfWeek">Day of Week</option>
                <option value="hostOrKj">Host / KJ Name</option>
                <option value="signupMethod">Signup Method</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                Proposed Value
              </label>
              <input
                type="text"
                required
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder={
                  fieldName.includes("Genre")
                    ? "e.g., Hip-Hop/Rap, R&B/Soul, Rock, All Genres"
                    : "e.g., 9:00 PM or KJ Meshell"
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                data-testid="correction-value-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                How do you know? (Basis / Source Link)
              </label>
              <textarea
                required
                rows={2}
                value={sourceOrBasis}
                onChange={(e) => setSourceOrBasis(e.target.value)}
                placeholder="e.g., Performed here last Friday; KJ announced all genres welcome / link to venue flyer"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                data-testid="correction-basis-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                Your Role
              </label>
              <select
                value={submitterRole}
                onChange={(e) =>
                  setSubmitterRole(
                    e.target.value as "crowd_report" | "kj" | "venue"
                  )
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
              >
                <option value="crowd_report">Performer / Crowd Report</option>
                <option value="kj">Host / KJ of this Night</option>
                <option value="venue">Venue Owner / Manager</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-[#A0A3BD] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] px-5 py-2 text-xs font-bold text-[#0B0B14] shadow-lg"
                data-testid="submit-correction-btn"
              >
                {submitting ? "Submitting..." : "Submit Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "venue" | "night" | "person";
  targetId: string;
  targetName: string;
}

export function ClaimModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ClaimModalProps) {
  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [claimantRole, setClaimantRole] = useState("Host / KJ");
  const [socialOrWebProof, setSocialOrWebProof] = useState("");
  const [assertedPrimaryGenre, setAssertedPrimaryGenre] = useState("UNKNOWN");
  const [assertedAlsoWelcome, setAssertedAlsoWelcome] = useState("");
  const [assertedNotAFit, setAssertedNotAFit] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        targetName,
        claimantName,
        claimantEmail,
        claimantRole,
        socialOrWebProof,
        assertedPrimaryGenre,
        assertedAlsoWelcome: assertedAlsoWelcome || "UNKNOWN",
        assertedNotAFit: assertedNotAFit || "UNKNOWN",
        scheduleNotes,
      }),
    });
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      data-testid="claim-modal"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#FF2E93]/40 bg-[#151525] p-6 text-[#F8F9FA] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#A0A3BD] hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF2E93]">
          <ShieldAlert className="h-4 w-4" />
          <span>Free Claim • Founding KJs Get 6 Months Pro Free</span>
        </div>

        <h3 className="font-display text-xl font-bold">
          Claim {targetName}
        </h3>
        <p className="mt-1 text-xs text-[#A0A3BD]">
          Submitting a claim puts it in the Admin Review Queue. Nothing changes publicly until approved.
        </p>

        {submitted ? (
          <div
            className="mt-6 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-4 text-sm text-[#00E676]"
            data-testid="claim-success-message"
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              <span>Pending Claim Created in Review Queue</span>
            </div>
            <p className="mt-1 text-xs text-[#F8F9FA]/90">
              Public data has not been modified. Once approved by an admin, your genre assertions go live and stamp last_confirmed.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 rounded-lg bg-[#00E676] px-4 py-2 text-xs font-bold text-[#0B0B14]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleClaimSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  Your Name / Stage Name
                </label>
                <input
                  type="text"
                  required
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  placeholder="e.g., KJ Meshell"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  data-testid="claim-name-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={claimantEmail}
                  onChange={(e) => setClaimantEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  data-testid="claim-email-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  Role
                </label>
                <select
                  value={claimantRole}
                  onChange={(e) => setClaimantRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                >
                  <option value="Host / KJ">Host / KJ</option>
                  <option value="Venue Owner / Manager">
                    Venue Owner / Manager
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  IG / FB / Website Proof Link
                </label>
                <input
                  type="text"
                  required
                  value={socialOrWebProof}
                  onChange={(e) => setSocialOrWebProof(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  data-testid="claim-proof-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                Assert Primary Genre Fit for This Room
              </label>
              <select
                value={assertedPrimaryGenre}
                onChange={(e) => setAssertedPrimaryGenre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                data-testid="claim-primary-genre-select"
              >
                <option value="UNKNOWN">Select or leave UNKNOWN</option>
                {GENRE_TAXONOMY.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  Also Welcome Genres
                </label>
                <input
                  type="text"
                  value={assertedAlsoWelcome}
                  onChange={(e) => setAssertedAlsoWelcome(e.target.value)}
                  placeholder="e.g., Hip-Hop/Rap, R&B, Country"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A0A3BD]">
                  Not a Fit (Honest Room Boundary)
                </label>
                <input
                  type="text"
                  value={assertedNotAFit}
                  onChange={(e) => setAssertedNotAFit(e.target.value)}
                  placeholder="e.g., Acoustic only / No heavy metal"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A3BD]">
                Schedule &amp; Signup Notes
              </label>
              <input
                type="text"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="e.g., Signups at 8:30 PM, show 9:00 PM - 1:00 AM"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-[#A0A3BD]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#FF2E93] px-5 py-2 text-xs font-bold text-white shadow-lg"
                data-testid="submit-claim-btn"
              >
                Submit Claim for Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
