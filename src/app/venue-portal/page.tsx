"use client";

import React, { useEffect, useState } from "react";
import {
  APP_NAME,
  LEGAL_COMP_OPTIONS,
  PRICING_TIERS,
  GENRE_TAXONOMY,
} from "@/config/brand";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Utensils,
} from "lucide-react";

interface PromoItem {
  id: string;
  venueSlug: string;
  venueName: string;
  title: string;
  promoCategory: string;
  compType: string;
  description: string;
}

export default function VenuePortalPage() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [venueName, setVenueName] = useState("Time Warp Bar");
  const [title, setTitle] = useState("");
  const [promoCategory, setPromoCategory] = useState("Food Special");
  const [compType, setCompType] = useState<string>(LEGAL_COMP_OPTIONS[0].id);
  const [description, setDescription] = useState("");
  const [promoStatus, setPromoStatus] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Claim state
  const [claimVenueName, setClaimVenueName] = useState("");
  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [claimProof, setClaimProof] = useState("");
  const [claimGenre, setClaimGenre] = useState("UNKNOWN");
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  async function loadPromos() {
    const res = await fetch("/api/promotions");
    const data = await res.json();
    if (Array.isArray(data.promotions)) setPromos(data.promotions);
  }

  useEffect(() => {
    loadPromos();
  }, []);

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    setPromoError(null);
    setPromoStatus(null);

    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: venueName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        venueName,
        title,
        promoCategory,
        compType,
        description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPromoError(data.error || "Unable to save promotion.");
    } else {
      setPromoStatus("Promotion published to venue page!");
      setTitle("");
      setDescription("");
      await loadPromos();
    }
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "venue",
        targetId: claimVenueName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        targetName: claimVenueName,
        claimantName,
        claimantEmail,
        claimantRole: "Venue Owner / Manager",
        socialOrWebProof: claimProof,
        assertedPrimaryGenre: claimGenre,
      }),
    });
    setClaimSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-[#151525] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#00F0FF]">
              <Building2 className="h-4 w-4" />
              <span>{APP_NAME} • Free Venue Claim &amp; Offer Portal</span>
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold text-[#F8F9FA] sm:text-4xl">
              Claim Your Cleveland Venue &amp; Post Performer Offers
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#A0A3BD]">
              Claiming your listing is 100% free. Venue Premium upsell ($
              {(PRICING_TIERS.venuePremiumMonthlyCents / 100).toFixed(0)}/mo) adds guest-KJ booking tools and crew draw insights.
            </p>
          </div>
          <div className="rounded-2xl border border-[#00E676]/40 bg-[#0B0B14] px-4 py-3 text-xs text-[#00E676]">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Ohio Rule 50 / ORC 4301.22(D) Compliant</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#A0A3BD]">
              Cash via Platform + Food / Non-Alcoholic Comps Only
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Claim Venue Form */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Sparkles className="h-5 w-5 text-[#FF2E93]" />
              <span>1. Submit a Free Venue Claim</span>
            </h2>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Creates a pending claim in the Admin Review Queue. Nothing public changes until verified.
            </p>

            {claimSubmitted ? (
              <div
                className="mt-4 rounded-2xl border border-[#00E676]/40 bg-[#00E676]/10 p-4 text-xs text-[#00E676]"
                data-testid="venue-claim-queued-banner"
              >
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Pending Venue Claim Queued for Admin Review!
                  </span>
                </div>
                <p className="mt-1 text-[#F8F9FA]">
                  Once approved in Admin, your genre assertions go live and stamp last_confirmed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    required
                    value={claimVenueName}
                    onChange={(e) => setClaimVenueName(e.target.value)}
                    placeholder="e.g., Tina's Nite Club or Corky's Place"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                    data-testid="venue-portal-claim-venue-input"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#A0A3BD]">
                      Owner / Manager Name
                    </label>
                    <input
                      type="text"
                      required
                      value={claimantName}
                      onChange={(e) => setClaimantName(e.target.value)}
                      placeholder="Your full name"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A0A3BD]">
                      Business Email
                    </label>
                    <input
                      type="email"
                      required
                      value={claimantEmail}
                      onChange={(e) => setClaimantEmail(e.target.value)}
                      placeholder="owner@venue.com"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Verification Link (Website / Official Social)
                  </label>
                  <input
                    type="text"
                    required
                    value={claimProof}
                    onChange={(e) => setClaimProof(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Primary Genre Fit
                  </label>
                  <select
                    value={claimGenre}
                    onChange={(e) => setClaimGenre(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  >
                    <option value="UNKNOWN">Leave UNKNOWN</option>
                    {GENRE_TAXONOMY.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#FF2E93] py-2.5 text-xs font-bold text-white shadow-lg"
                  data-testid="venue-portal-claim-submit-btn"
                >
                  Submit Venue Claim to Review Queue
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Non-Alcohol Promo & Performer Offer Creator */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Utensils className="h-5 w-5 text-[#00E676]" />
              <span>2. Create Kitchen Special or Performer Cash Offer</span>
            </h2>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Select from compliant compensation options (Cash via Platform, Food/Kitchen Comp, Non-Alcoholic Refreshments, or Door Split).
            </p>

            {promoError && (
              <div
                className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-300"
                data-testid="promo-compliance-error"
              >
                {promoError}
              </div>
            )}
            {promoStatus && (
              <div
                className="mt-3 rounded-xl border border-[#00E676]/40 bg-[#00E676]/10 p-3 text-xs font-bold text-[#00E676]"
                data-testid="promo-created-banner"
              >
                {promoStatus}
              </div>
            )}

            <form onSubmit={handleCreatePromo} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A3BD]">
                    Category
                  </label>
                  <select
                    value={promoCategory}
                    onChange={(e) => setPromoCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  >
                    <option value="Food Special">Food Special</option>
                    <option value="Late Night Happy Hour">
                      Late Night Kitchen Special
                    </option>
                    <option value="Theme Night">Theme Night</option>
                    <option value="Featured Listing">Featured Listing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Compensation / Offer Structure (Legal Options Only)
                </label>
                <select
                  value={compType}
                  onChange={(e) => setCompType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  data-testid="comp-type-select"
                >
                  {LEGAL_COMP_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Offer Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., $50 Crew Cash Stipend + Late-Night Taco Basket"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] px-3 py-2 text-sm text-[#F8F9FA]"
                  data-testid="promo-title-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A3BD]">
                  Details
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe kitchen items, non-alcoholic refreshments, or platform cash payout..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0B0B14] p-3 text-xs text-[#F8F9FA]"
                  data-testid="promo-description-input"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#00E676] to-[#00F0FF] py-2.5 text-xs font-bold text-[#0B0B14]"
                data-testid="create-promo-btn"
              >
                Publish Compliant Venue Offer
              </button>
            </form>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold uppercase text-[#A0A3BD]">
                Active Compliant Offers ({promos.length})
              </h3>
              {promos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-[#0B0B14] p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00E676]">{p.title}</span>
                    <span className="rounded bg-[#151525] px-2 py-0.5 text-[10px] text-[#00F0FF]">
                      {p.promoCategory}
                    </span>
                  </div>
                  <p className="mt-1 text-[#A0A3BD]">
                    {p.venueName}: {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
