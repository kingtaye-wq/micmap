import { APP_NAME, APP_DOMAIN, SUPPORT_EMAIL } from "@/config/brand";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-[#151525] p-8">
        <h1 className="font-display text-3xl font-bold text-[#F8F9FA]">
          {APP_NAME} ({APP_DOMAIN}) — Terms of Use &amp; Anti-Scrape Policy
        </h1>
        <p className="mt-2 text-sm text-[#A0A3BD]">
          Effective Date: October 31, 2026
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-[#F8F9FA]/90">
          <section>
            <h2 className="font-display text-lg font-bold text-[#00F0FF]">
              1. Strict Prohibition on Automated Scraping &amp; Bulk Export
            </h2>
            <p className="mt-1 text-[#A0A3BD]">
              Automated scraping, crawling, harvesting, bulk downloading, or commercial republishing of {APP_NAME} venue listings, night schedules, host rosters, or genre-fit assertions is strictly prohibited. {APP_NAME} intentionally provides per-page directory views without bulk API dumps.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-[#00F0FF]">
              2. Performer &amp; Venue Compensation Compliance (Ohio Rule 50 / ORC 4301.22(D))
            </h2>
            <p className="mt-1 text-[#A0A3BD]">
              All venue and crew offers listed on {APP_NAME} are strictly restricted to cash stipends processed via Stripe Connect, food/kitchen comps, or non-alcoholic refreshments. No alcoholic beverage promotions or prize mechanics are permitted on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-[#00F0FF]">
              3. Contact &amp; Takedown Requests
            </h2>
            <p className="mt-1 text-[#A0A3BD]">
              For listing claims, moderation reports, or inquiries, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FF2E93] underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
