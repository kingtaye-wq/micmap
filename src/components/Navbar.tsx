import Link from "next/link";
import {
  APP_NAME,
  APP_DOMAIN,
  DEFAULT_CITY,
  PUBLIC_ASSISTANT_TITLE,
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
    <header className="no-print sticky top-0 z-50 border-b border-white/10 bg-[#0B0B14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#F8F9FA]"
            data-testid="brand-logo-link"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF2E93] to-[#00F0FF] text-[#0B0B14] shadow-[0_0_20px_rgba(255,46,147,0.45)]">
              <Mic className="h-5 w-5 stroke-[2.4]" />
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
            <span className="text-[#00E676]">73 Verified Live</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium sm:gap-2 sm:text-sm">
          <Link
            href="/cleveland"
            className="rounded-lg px-2.5 py-1.5 text-[#F8F9FA] transition hover:bg-[#1E1E34] hover:text-[#00F0FF]"
          >
            Cleveland Map
          </Link>
          <Link
            href="/tonight"
            className="rounded-lg px-2.5 py-1.5 text-[#F8F9FA] transition hover:bg-[#1E1E34] hover:text-[#FF2E93]"
          >
            Tonight
          </Link>
          <Link
            href="/hosts/shell-yeah-events-by-meshell"
            className="rounded-lg px-2.5 py-1.5 text-[#A0A3BD] transition hover:bg-[#1E1E34] hover:text-[#F8F9FA]"
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
            className="flex items-center gap-1 rounded-lg border border-[#FF2E93]/40 bg-[#FF2E93]/10 px-2.5 py-1.5 text-[#FF2E93] transition hover:bg-[#FF2E93]/20"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Live Room</span>
          </Link>
          <Link
            href="/kj/console"
            className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2.5 py-1.5 text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
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
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-[#151525] px-2.5 py-1.5 text-[#F8F9FA] transition hover:border-[#00F0FF]/50"
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-[#00F0FF]" />
            <span>{APP_NAME} OS</span>
          </Link>
          <Link
            href="/admin/verification-queue"
            className="flex items-center gap-1 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 px-2.5 py-1.5 text-[#FFB800] transition hover:bg-[#FFB800]/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin (58)</span>
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/5 bg-[#151525]/70 px-4 py-1 text-center text-[11px] text-[#A0A3BD]">
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
