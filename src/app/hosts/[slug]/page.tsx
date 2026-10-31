import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { APP_NAME, APP_DOMAIN, FOUNDING_KJ_TARGETS } from "@/config/brand";
import { generateQrSvgString } from "@/lib/qr-svg";
import { HostTipAndFollowBox } from "@/components/HostTipAndFollowBox";
import {
  Mic,
  CheckCircle2,
  Printer,
  Calendar,
  MapPin,
  Sparkles,
  QrCode,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore();
  const host =
    store.hosts.find((h) => h.slug === slug) || store.hosts[0];

  if (!host) {
    notFound();
  }

  const hostPublicUrl = `https://${APP_DOMAIN}/hosts/${host.slug}`;
  const qrSvg = await generateQrSvgString(hostPublicUrl);
  const primaryRoomCode = host.nights[0]?.roomCode || "CLE-018";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Host Header Banner (Mockup 2 Host Profile direction) */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151525] via-[#1E1E34] to-[#0B0B14] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#FF2E93] bg-[#0B0B14] text-2xl font-bold text-[#FF2E93] shadow-[0_0_25px_rgba(255,46,147,0.4)]">
              <Mic className="h-9 w-9" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF2E93]">
                  {APP_NAME} • Official Host Website
                </span>
                {host.isFoundingKj && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#00E676]">
                    <Sparkles className="h-3 w-3" />
                    Founding KJ Roster (6 Months KJ Pro Free)
                  </span>
                )}
              </div>

              <h1 className="font-display mt-1 flex items-center gap-2 text-2xl font-bold text-[#F8F9FA] sm:text-4xl">
                <span>{host.displayName}</span>
                <CheckCircle2 className="h-6 w-6 text-[#00F0FF]" />
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-[#A0A3BD]">
                {host.bio}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg border border-white/10 bg-[#0B0B14] px-2.5 py-1 text-[#F8F9FA]">
                  Home Metro: {host.homeCity}
                </span>
                <span className="font-mono-code rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2.5 py-1 text-[#00F0FF]">
                  {APP_DOMAIN}/hosts/{host.slug}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              href={`/kj/poster/${primaryRoomCode}?host=${host.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#FFB800] px-4 py-2.5 text-xs font-bold text-[#0B0B14] shadow-lg"
              data-testid="printable-poster-link"
            >
              <Printer className="h-4 w-4" />
              <span>Printable Table-Tent QR Poster (PDF)</span>
            </Link>
            <Link
              href={`/room/${primaryRoomCode}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2.5 text-xs font-bold text-[#00F0FF]"
            >
              <span>Open Live Stage Room ({primaryRoomCode})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Weekly Schedule & Genre Tags */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
                <Calendar className="h-5 w-5 text-[#FF2E93]" />
                <span>Weekly Schedule ({host.nights.length} Recurring Nights)</span>
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {host.nights.map((night) => (
                <div
                  key={night.id}
                  className="rounded-2xl border border-white/10 bg-[#1E1E34] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#FF2E93] px-2.5 py-0.5 text-xs font-bold text-white">
                      {night.dayOfWeek === "UNKNOWN"
                        ? "Day Pending Verification"
                        : night.dayOfWeek}
                    </span>
                    <span className="font-mono-code text-xs text-[#00F0FF]">
                      {night.roomCode}
                    </span>
                  </div>

                  <h3 className="font-display mt-2 text-base font-bold text-[#F8F9FA]">
                    <Link
                      href={`/venues/${night.venueSlug}`}
                      className="hover:text-[#00F0FF]"
                    >
                      {night.venueName}
                    </Link>
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#A0A3BD]">
                    <MapPin className="h-3 w-3 text-[#FF2E93]" />
                    <span>{night.neighborhood}</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#F8F9FA]">
                    Start:{" "}
                    {night.startTime === "UNKNOWN"
                      ? "Pending Verification"
                      : night.startTime}
                  </p>
                  <p className="mt-1 text-[11px] text-[#00E676]">
                    Genre Fit:{" "}
                    {night.genreVibeTags === "UNKNOWN"
                      ? "Genre fit not yet reported"
                      : night.genreVibeTags}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Link
                      href={`/nights/${night.slug}`}
                      className="text-[#00F0FF] hover:underline"
                    >
                      Night Details →
                    </Link>
                    <Link
                      href={`/kj/poster/${night.roomCode}?host=${host.slug}`}
                      className="text-[#FFB800] hover:underline"
                    >
                      Print Poster →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Share Card */}
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div
                className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-white p-2 shadow-lg"
                data-testid="host-profile-qr-svg"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#00F0FF]">
                  <QrCode className="h-4 w-4" />
                  <span>Direct Host QR Code</span>
                </div>
                <h3 className="font-display mt-1 text-lg font-bold text-[#F8F9FA]">
                  Scan to Follow &amp; Tip {host.displayName}
                </h3>
                <p className="mt-1 text-xs text-[#A0A3BD]">
                  Points directly to{" "}
                  <code className="font-mono-code text-[#00F0FF]">
                    {hostPublicUrl}
                  </code>
                  . Founding KJs Targets: {FOUNDING_KJ_TARGETS.join(" • ")}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Follow, Tip (5% Fee), and Booking Box */}
        <div className="lg:col-span-5">
          <HostTipAndFollowBox
            recipientType="kj"
            recipientSlug={host.slug}
            recipientName={host.displayName}
            roomCode={primaryRoomCode}
            initialFollowerCount={host.followerCount}
            initialBalanceCents={host.availableBalanceCents}
          />
        </div>
      </div>
    </div>
  );
}
