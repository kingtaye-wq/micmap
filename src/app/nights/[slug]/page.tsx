import Link from "next/link";
import { notFound } from "next/navigation";
import { syncStoreFromSupabase } from "@/lib/store";
import { NightAndVenueActions } from "@/components/NightAndVenueActions";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Radio,
  ArrowLeft,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await syncStoreFromSupabase();
  const night = store.nights.find(
    (n) => n.slug === slug || n.id === slug || n.venueSlug === slug
  );

  if (!night || night.confidence !== "verified") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/cleveland"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Greater Cleveland Map</span>
      </Link>

      <div className="mt-4 rounded-3xl border border-white/10 bg-[#151525] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FF2E93]/20 px-3 py-1 text-xs font-bold text-[#FF2E93]">
                {night.nightTypeLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-[#1E1E34] px-3 py-1 text-xs text-[#F8F9FA]">
                {night.formatType}
              </span>
              {night.freshnessStatus === "call_to_confirm" ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/50 bg-[#FFB800]/15 px-3 py-1 text-xs font-bold text-[#FFB800]"
                  data-testid="freshness-badge-warning"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Call to confirm • {night.daysSinceConfirmed} days since last confirmation
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-3 py-1 text-xs font-bold text-[#00E676]"
                  data-testid="freshness-badge-verified"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified ({night.lastConfirmedText})
                </span>
              )}
            </div>

            <h1 className="font-display mt-3 text-3xl font-bold text-[#F8F9FA] sm:text-4xl">
              {night.venueName} — {night.dayOfWeek}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#A0A3BD]">
              <MapPin className="h-4 w-4 text-[#FF2E93]" />
              <span>
                {night.neighborhood} •{" "}
                {night.address ||
                  "Pending Verification — Know the details? Submit an update"}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-[#00F0FF]/30 bg-[#0B0B14] p-4 text-right">
            <span className="block text-[10px] uppercase tracking-wider text-[#A0A3BD]">
              Live Room Code
            </span>
            <span className="font-mono-code text-xl font-bold text-[#00F0FF]">
              {night.roomCode}
            </span>
            <div className="mt-2">
              <Link
                href={`/room/${night.roomCode}`}
                className="inline-flex items-center gap-1 rounded-lg bg-[#FF2E93] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Enter Live Room</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Schedule & Host Metadata */}
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-[#1E1E34] p-5 sm:grid-cols-4">
          <div>
            <span className="text-xs text-[#A0A3BD]">Day &amp; Start Time</span>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#F8F9FA]">
              <Clock className="h-4 w-4 text-[#00F0FF]" />
              <span>
                {night.dayOfWeek} •{" "}
                {night.startTime === "UNKNOWN"
                  ? "Pending Verification — Know the details? Submit an update"
                  : night.startTime}
              </span>
            </p>
          </div>

          <div>
            <span className="text-xs text-[#A0A3BD]">Host / KJ</span>
            <p className="mt-1 text-sm font-bold text-[#F8F9FA]">
              {night.hostSlug ? (
                <Link
                  href={`/hosts/${night.hostSlug}`}
                  className="text-[#FF2E93] underline"
                >
                  {night.hostOrKj}
                </Link>
              ) : night.hostOrKj === "UNKNOWN" ? (
                <span className="text-[#FFB800]">
                  Pending Verification — Submit an update
                </span>
              ) : (
                night.hostOrKj
              )}
            </p>
          </div>

          <div>
            <span className="text-xs text-[#A0A3BD]">Signup Method</span>
            <p className="mt-1 text-sm font-semibold text-[#F8F9FA]">
              {night.signupMethod === "UNKNOWN"
                ? "Pending Verification"
                : night.signupMethod}
            </p>
          </div>

          <div>
            <span className="text-xs text-[#A0A3BD]">Cover / Age Policy</span>
            <p className="mt-1 text-sm font-semibold text-[#F8F9FA]">
              Cover: {night.cover === "UNKNOWN" ? "Pending Verification" : night.cover} • Age:{" "}
              {night.agePolicy === "UNKNOWN" ? "Pending Verification" : night.agePolicy}
            </p>
          </div>
        </div>

        {/* Genre-Fit Block with Attribution */}
        <div className="mt-6 rounded-2xl border border-[#00F0FF]/30 bg-[#0B0B14] p-5">
          <h2 className="font-display text-lg font-bold text-[#F8F9FA]">
            Genre-Fit Profile (Per-Night Differentiator)
          </h2>
          <p className="text-xs text-[#A0A3BD]">
            As reported by: <strong className="text-[#00F0FF]">{night.assertedBy}</strong>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#151525] p-3.5">
              <span className="text-xs font-semibold uppercase text-[#A0A3BD]">
                Primary Genre
              </span>
              <p
                className="mt-1 text-sm font-bold text-[#FF2E93]"
                data-testid="night-primary-genre"
              >
                {night.primaryGenre === "UNKNOWN"
                  ? "Pending Verification — Know the details? Submit an update"
                  : night.primaryGenre}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#151525] p-3.5">
              <span className="text-xs font-semibold uppercase text-[#A0A3BD]">
                Also Welcome
              </span>
              <p className="mt-1 text-sm font-bold text-[#00F0FF]">
                {night.alsoWelcome === "UNKNOWN"
                  ? "Pending Verification — Know the details? Submit an update"
                  : night.alsoWelcome}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#151525] p-3.5">
              <span className="text-xs font-semibold uppercase text-[#A0A3BD]">
                Not a Fit
              </span>
              <p className="mt-1 text-sm font-bold text-rose-400">
                {night.notAFit === "UNKNOWN"
                  ? "Pending Verification — Know the details? Submit an update"
                  : night.notAFit}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-[#A0A3BD]">
            <span>
              <strong>Evidence / Basis:</strong> {night.genreBasis}
            </span>
            {night.sourceUrl && (
              <a
                href={night.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#00F0FF] hover:underline"
              >
                <span>Primary Source Link</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6">
          <NightAndVenueActions
            nightId={night.id}
            venueSlug={night.venueSlug}
            venueName={night.venueName}
            roomCode={night.roomCode}
            hostSlug={night.hostSlug}
            hostName={night.hostOrKj}
          />
        </div>
      </div>
    </div>
  );
}
