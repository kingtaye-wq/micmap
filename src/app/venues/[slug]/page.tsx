import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { NightAndVenueActions } from "@/components/NightAndVenueActions";
import {
  MapPin,
  Clock,
  Radio,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore();

  // Match either by canonical venueSlug or by a specific night slug
  const venue = store.venues.find((v) => v.slug === slug);
  const fallbackNight = store.nights.find(
    (n) => n.slug === slug || n.id === slug
  );

  const targetVenue =
    venue ||
    (fallbackNight
      ? store.venues.find((v) => v.slug === fallbackNight.venueSlug)
      : null);

  if (!targetVenue) {
    notFound();
  }

  // Only show verified nights on public venue page
  const publicNights = store.nights.filter(
    (n) =>
      n.venueSlug === targetVenue.slug &&
      n.confidence === "verified" &&
      n.freshnessStatus !== "expired_90d"
  );

  const primaryNight = publicNights[0] || targetVenue.nights[0];
  const venuePromos = store.promotions.filter(
    (p) => p.venueSlug === targetVenue.slug && p.active
  );
  const liveQueue = store.songRequests.filter(
    (sr) => sr.roomCode === primaryNight.roomCode
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/cleveland"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Greater Cleveland Map</span>
      </Link>

      {/* Venue Header Card */}
      <div className="mt-4 rounded-3xl border border-white/10 bg-[#151525] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-xs font-semibold text-[#00F0FF]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{targetVenue.neighborhood} Venue Profile</span>
            </span>
            <h1 className="font-display mt-2 text-3xl font-bold text-[#F8F9FA] sm:text-4xl">
              {targetVenue.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#A0A3BD]">
              <MapPin className="h-4 w-4 text-[#FF2E93]" />
              <span>
                {targetVenue.address ||
                  "Pending Verification — Know the details? Submit an update"}
              </span>
            </p>
            {targetVenue.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${targetVenue.name} ${targetVenue.address}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#00F0FF] hover:underline"
              >
                <span>Get Directions</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-[#FF2E93]/40 bg-[#0B0B14] p-4 text-right">
            <span className="block text-[10px] uppercase tracking-wider text-[#A0A3BD]">
              Active Stage Room
            </span>
            <span className="font-mono-code text-xl font-bold text-[#FF2E93]">
              {primaryNight.roomCode}
            </span>
            <div className="mt-2">
              <Link
                href={`/room/${primaryNight.roomCode}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#00F0FF] px-3.5 py-1.5 text-xs font-bold text-[#0B0B14]"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Open Singer Live Room</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <NightAndVenueActions
            nightId={primaryNight.id}
            venueSlug={targetVenue.slug}
            venueName={targetVenue.name}
            roomCode={primaryNight.roomCode}
            hostSlug={primaryNight.hostSlug}
            hostName={primaryNight.hostOrKj}
          />
        </div>
      </div>

      {/* Venue's Verified Recurring Nights */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <h2 className="font-display text-2xl font-bold text-[#F8F9FA]">
            Verified Weekly &amp; Monthly Nights ({publicNights.length})
          </h2>

          {publicNights.map((night) => (
            <div
              key={night.id}
              className="rounded-2xl border border-white/10 bg-[#1E1E34] p-5"
              data-testid="venue-night-item"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#FF2E93]/20 px-3 py-0.5 text-xs font-bold text-[#FF2E93]">
                    {night.nightTypeLabel}
                  </span>
                  <span className="font-display text-lg font-bold text-[#F8F9FA]">
                    {night.dayOfWeek === "UNKNOWN"
                      ? "Schedule Pending Verification"
                      : night.dayOfWeek}
                  </span>
                </div>

                {night.freshnessStatus === "call_to_confirm" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-2.5 py-0.5 text-xs font-bold text-[#FFB800]">
                    <AlertTriangle className="h-3 w-3" />
                    Call to confirm ({night.daysSinceConfirmed}d)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-2.5 py-0.5 text-xs font-bold text-[#00E676]">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#A0A3BD]">
                <span className="inline-flex items-center gap-1 text-[#F8F9FA]">
                  <Clock className="h-3.5 w-3.5 text-[#00F0FF]" />
                  Start:{" "}
                  {night.startTime === "UNKNOWN"
                    ? "Pending Verification — Know the details? Submit an update"
                    : night.startTime}
                </span>
                <span>
                  Host/KJ:{" "}
                  {night.hostSlug ? (
                    <Link
                      href={`/hosts/${night.hostSlug}`}
                      className="font-bold text-[#FF2E93] underline"
                    >
                      {night.hostOrKj}
                    </Link>
                  ) : night.hostOrKj === "UNKNOWN" ? (
                    "Pending Verification — Submit an update"
                  ) : (
                    night.hostOrKj
                  )}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-[#151525] p-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] uppercase text-[#A0A3BD]">
                    Primary Genre
                  </span>
                  <span className="font-bold text-[#FF2E93]">
                    {night.primaryGenre === "UNKNOWN"
                      ? "Pending Verification — Submit an update"
                      : night.primaryGenre}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#A0A3BD]">
                    Also Welcome
                  </span>
                  <span className="font-semibold text-[#00F0FF]">
                    {night.alsoWelcome === "UNKNOWN"
                      ? "Pending Verification"
                      : night.alsoWelcome}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#A0A3BD]">
                    Not a Fit
                  </span>
                  <span className="font-semibold text-[#A0A3BD]">
                    {night.notAFit === "UNKNOWN"
                      ? "Pending Verification"
                      : night.notAFit}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#A0A3BD]">
                <span>Basis: {night.genreBasis}</span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/nights/${night.slug}`}
                    className="font-semibold text-[#00F0FF] hover:underline"
                  >
                    Full Night Details →
                  </Link>
                  <Link
                    href={`/room/${night.roomCode}`}
                    className="font-semibold text-[#FF2E93] hover:underline"
                  >
                    Room {night.roomCode} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Live Room Preview & Non-Alcohol Specials */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-[#FF2E93]/30 bg-[#151525] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#F8F9FA]">
                Live Room Queue Preview
              </h3>
              <span className="font-mono-code text-xs text-[#00E676]">
                {primaryNight.roomCode}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Scan QR at the table or open the browser room — no app download required.
            </p>

            <div className="mt-3 space-y-2">
              {liveQueue.length === 0 ? (
                <p className="rounded-xl bg-[#0B0B14] p-3 text-xs text-[#A0A3BD]">
                  Stage queue is open for requests. Be the first singer up tonight!
                </p>
              ) : (
                liveQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0B14] px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#F8F9FA]">
                        {item.singerStageName}
                      </span>{" "}
                      <span className="text-[#A0A3BD]">
                        — &ldquo;{item.songTitle}&rdquo;
                      </span>
                    </div>
                    <span className="rounded-md bg-[#FF2E93]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF2E93]">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>

            <Link
              href={`/room/${primaryNight.roomCode}`}
              className="mt-4 block w-full rounded-xl bg-[#FF2E93] py-2.5 text-center text-xs font-bold text-white"
            >
              Request Song / Tip KJ in Room {primaryNight.roomCode}
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151525] p-5">
            <h3 className="font-display text-base font-bold text-[#F8F9FA]">
              Kitchen &amp; Performer Offers
            </h3>
            <p className="mt-1 text-[11px] text-[#A0A3BD]">
              Cash via Platform + Food / Non-Alcoholic Refreshments only (Ohio Rule 50 compliant).
            </p>
            <div className="mt-3 space-y-2">
              {venuePromos.length === 0 ? (
                <p className="text-xs text-[#A0A3BD]">
                  Are you the venue owner?{" "}
                  <Link
                    href="/venue-portal"
                    className="text-[#00F0FF] underline"
                  >
                    Post a Food Special or Performer Cash Offer
                  </Link>
                  .
                </p>
              ) : (
                venuePromos.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#00E676]/30 bg-[#0B0B14] p-3 text-xs"
                  >
                    <span className="font-bold text-[#00E676]">{p.title}</span>
                    <p className="mt-1 text-[#A0A3BD]">{p.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
