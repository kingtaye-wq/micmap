import Link from "next/link";
import { getStore } from "@/lib/store";
import { APP_NAME, APP_DOMAIN } from "@/config/brand";
import { generateQrSvgString } from "@/lib/qr-svg";
import { PrintPosterButton } from "@/components/PrintPosterButton";
import { Mic, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KjPrintablePosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ host?: string }>;
}) {
  const { roomCode } = await params;
  const { host: hostParam } = await searchParams;
  const normalizedCode = (roomCode || "CLE-018").toUpperCase();

  const store = getStore();
  const night =
    store.nights.find((n) => n.roomCode.toUpperCase() === normalizedCode) ||
    store.nights.find((n) => n.id === "night-18")!;

  const hostSlug =
    hostParam || night.hostSlug || "shell-yeah-events-by-meshell";
  const host =
    store.hosts.find((h) => h.slug === hostSlug) || store.hosts[0];

  const targetUrl = `https://${APP_DOMAIN}/hosts/${host.slug}?room=${normalizedCode}`;
  const qrSvg = await generateQrSvgString(targetUrl);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Screen-only toolbar */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#151525] p-4">
        <Link
          href="/kj/console"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to KJ Console</span>
        </Link>
        <PrintPosterButton />
      </div>

      {/* Printable Table-Tent / Stage Poster (Mockup 2 layout) */}
      <div
        className="mx-auto max-w-md overflow-hidden rounded-3xl border-4 border-[#FF2E93] bg-white text-[#0B0B14] shadow-2xl"
        data-testid="printable-kj-poster"
      >
        {/* Top White Header Section */}
        <div className="bg-white px-8 pb-12 pt-8 text-center">
          <div className="inline-flex items-center justify-center gap-2 text-4xl font-extrabold tracking-tight text-[#5E0B3E]">
            <span className="font-display">{APP_NAME}</span>
            <Mic className="h-9 w-9 text-[#FF2E93]" />
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#5E0B3E]/70">
            {night.venueName} • {night.neighborhood}
          </p>
        </div>

        {/* Lower Deep Magenta / Burgundy Table-Tent Body */}
        <div className="relative bg-gradient-to-b from-[#5E0B3E] to-[#3B0626] px-8 pb-8 pt-14 text-center text-white">
          {/* Overlapping Circular Host Avatar */}
          <div className="absolute -top-12 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#FFB800] bg-[#0B0B14] text-[#FF2E93] shadow-xl">
            <Mic className="h-11 w-11" />
          </div>

          <p className="text-sm font-bold text-[#FFB800]">
            {host.displayName}
          </p>

          <h1 className="font-display mt-2 text-3xl font-extrabold leading-tight text-[#FFE082]">
            Follow Me and
            <br />
            Tip the Host
          </h1>
          <p className="mt-1 text-xs text-white/85">
            Scan to Request Your Song &amp; Tip the KJ
          </p>

          {/* Crisp SVG QR Code */}
          <div
            className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-3 shadow-2xl"
            data-testid="poster-qr-code"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div className="mt-4 space-y-1">
            <p
              className="font-mono-code text-sm font-bold text-[#00F0FF]"
              data-testid="poster-room-code"
            >
              Room Code: {normalizedCode}
            </p>
            <p
              className="font-mono-code text-xs text-white/90"
              data-testid="poster-target-url"
            >
              Scan to follow &amp; tip • {APP_DOMAIN}/hosts/{host.slug}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
