import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  APP_NAME,
  APP_DOMAIN,
  DEFAULT_METRO,
  SUPPORT_EMAIL,
  SOCIAL_HANDLES,
  PUBLIC_ASSISTANT_TITLE,
} from "@/config/brand";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_DOMAIN}) — ${DEFAULT_METRO} Karaoke & Open Mic Map`,
  description: `Every karaoke and open mic night in ${DEFAULT_METRO} on one map, with verified genre-fit per night (primary genre, also welcome, not a fit), follow + QR tip pages, and ${APP_NAME} OS.`,
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-[#0B0B14] text-[#F8F9FA] antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-white/10 bg-[#151525] py-8 text-xs text-[#A0A3BD]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-[#F8F9FA]">
                {APP_NAME} • {APP_DOMAIN}
              </p>
              <p>
                Launch Metro: {DEFAULT_METRO} • Assisted by {PUBLIC_ASSISTANT_TITLE} •{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-[#00F0FF] underline-offset-2 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p className="text-[11px] text-[#A0A3BD]/80">
                Original branding &amp; directory data. Performer &amp; crew offers are strictly cash via platform or food / non-alcoholic refreshments (Ohio Rule 50 / ORC 4301.22(D)).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>IG: {SOCIAL_HANDLES.instagram}</span>
              <span>FB: {SOCIAL_HANDLES.facebook}</span>
              <Link
                href="/venue-portal"
                className="text-[#F8F9FA] hover:text-[#00F0FF]"
              >
                Claim a Venue / Night
              </Link>
              <Link
                href="/terms"
                className="text-[#F8F9FA] hover:text-[#FF2E93]"
              >
                Terms &amp; Anti-Scrape Policy
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
