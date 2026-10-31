import Link from "next/link";
import {
  APP_NAME,
  APP_DOMAIN,
  DEFAULT_CITY,
  ENV_LABEL,
  PUBLIC_ASSISTANT_TITLE,
  STAGING_BANNER_TEXT,
} from "@/config/brand";
import {
  Mic,
  MapPin,
  Sparkles,
  ShieldCheck,
  Radio,
  LayoutDashboard,
  Building2,
} from "lucide-react";

export function Navbar() {
  return (
    <header className="no-print sticky top-0 z-50 w-full max-w-full overflow-x-hidden border-b border-white/10 bg-[#0B0B14]/95 backdrop-blur-md">
      {ENV_LABEL === "staging" && (
        <div
          className="border-b border-[#FFB800]/30 bg-[#FFB800]/15 px-3 py-1 text-center text-[10px] font-bold tracking-wide text-[#FFB800] sm:text-xs"
          data-testid="staging-preview-banner"
        >
          {STAGING_BANNER_TEXT}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-lg font-bold tracking-tight text-[#F8F9FA] sm:gap-2.5 sm:text-xl"
            data-testid="brand-logo-link"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF2E93] to-[#00F0FF] text-[#0B0B14] shadow-[0_0_20px_rgba(255,46,147,0.45)] sm:h-9 sm:w-9">
              <Mic className="h-4 w-4 stroke-[2.4] sm:h-5 sm:w-5" />
            </span>
            <span className="font-display bg-gradient-to-r from-[#F8F9FA] via-[#F8F9FA] to-[#00F0FF] bg-clip-text text-transparent">
              {APP_NAME}
            </span>
            <span className="font-mono-code hidden rounded-full border border-[#00F0FF]/30 bg-[#151525] px-2 py-0.5 text-[11px] font-medium text-[#00F0FF] sm:inline-block">
              {APP_DOMAIN}
            </span>
          </Link>

          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-[#151525] px-3 py-1 text-xs text-[#A0A3BD] lg:flex">
            <MapPin className="h-3.5 w-3.5 text-[#FF2E93]" />
            <span>{DEFAULT_CITY}</span>
            <span className="text-white/20">•</span>
            <span className="text-[#00E676]">Verified Live</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 text-[11px] font-medium sm:gap-2 sm:text-sm">
          <Link
            href="/cleveland"
            className="rounded-lg px-2 py-1 text-[#F8F9FA] transition hover:bg-[#1E1E34] hover:text-[#00F0FF] sm:px-2.5 sm:py-1.5"
          >
            Cleveland Map
          </Link>
          <Link
            href="/tonight"
            className="rounded-lg px-2 py-1 text-[#F8F9FA] transition hover:bg-[#1E1E34] hover:text-[#FF2E93] sm:px-2.5 sm:py-1.5"
          >
            Tonight
          </Link>
          <Link
            href="/hosts/shell-yeah-events-by-meshell"
            className="hidden rounded-lg px-2 py-1 text-[#A0A3BD] transition hover:bg-[#1E1E34] hover:text-[#F8F9FA] sm:inline-block sm:px-2.5 sm:py-1.5"
          >
            Hosts & KJs
          </Link>
          <Link
            href="/crews/coventry-cipher-collective"
            className="hidden rounded-lg px-2.5 py-1.5 text-[#A0A3BD] transition hover:bg-[#1E1E34] hover:text-[#F8F9FA] md:inline-block"
          >
            Crews
          </Link>
          <Link
            href="/room/CLE-018"
            className="flex items-center gap-1 rounded-lg border border-[#FF2E93]/40 bg-[#FF2E93]/10 px-2 py-1 text-[#FF2E93] transition hover:bg-[#FF2E93]/20 sm:px-2.5 sm:py-1.5"
          >
            <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Room</span>
          </Link>
          <Link
            href="/kj/console"
            className="hidden rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2.5 py-1.5 text-[#00F0FF] transition hover:bg-[#00F0FF]/20 sm:inline-block"
          >
            KJ Console
          </Link>
          <Link
            href="/venue-portal"
            className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-[#A0A3BD] transition hover:bg-[#1E1E34] hover:text-[#F8F9FA] xl:flex"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>For Venues</span>
          </Link>
          <Link
            href="/os"
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-[#151525] px-2 py-1 text-[#F8F9FA] transition hover:border-[#00F0FF]/50 sm:px-2.5 sm:py-1.5"
          >
            <LayoutDashboard className="h-3 w-3 text-[#00F0FF] sm:h-3.5 sm:w-3.5" />
            <span>OS</span>
          </Link>
          <Link
            href="/admin/verification-queue"
            className="flex items-center gap-1 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 px-2 py-1 text-[#FFB800] transition hover:bg-[#FFB800]/20 sm:px-2.5 sm:py-1.5"
          >
            <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Admin</span>
          </Link>
        </nav>
      </div>
      <div className="hidden border-t border-white/5 bg-[#151525]/70 px-4 py-1 text-center text-[11px] text-[#A0A3BD] sm:block">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[#00F0FF]" />
          <span>
            Curated by {APP_NAME} {PUBLIC_ASSISTANT_TITLE} • Genre-fit verified per night • Cash &amp; food/non-alcohol performer offers only
          </span>
        </span>
      </div>
    </header>
  );
}
