import Link from "next/link";
import { notFound } from "next/navigation";
import { syncStoreFromSupabase } from "@/lib/store";
import { APP_NAME, APP_DOMAIN, LEGAL_COMP_OPTIONS } from "@/config/brand";
import { HostTipAndFollowBox } from "@/components/HostTipAndFollowBox";
import { Users, Calendar, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CrewProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await syncStoreFromSupabase();
  const crew =
    store.artistsAndCrews.find((c) => c.slug === slug && c.kind === "crew") ||
    store.artistsAndCrews.find((c) => c.kind === "crew");

  if (!crew) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-[#151525] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#FF2E93]">
          <Users className="h-4 w-4" />
          <span>
            {APP_NAME} ({APP_DOMAIN}) • Verified Performer Crew
          </span>
        </div>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#F8F9FA] sm:text-4xl">
          {crew.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A0A3BD]">{crew.bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {crew.genres.map((g) => (
            <span
              key={g}
              className="rounded-full bg-[#00F0FF]/15 px-3 py-1 text-xs font-bold text-[#00F0FF]"
            >
              {g}
            </span>
          ))}
        </div>

        {crew.members && (
          <div className="mt-4 text-xs text-[#A0A3BD]">
            <strong>Crew Roster:</strong> {crew.members.join(" • ")}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Calendar className="h-5 w-5 text-[#FF2E93]" />
              <span>Joint Crew Schedule &amp; Appearances</span>
            </h2>
            <div className="mt-4 space-y-3">
              {crew.upcomingAppearances.map((app) => (
                <div
                  key={app.nightSlug}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1E1E34] p-4"
                >
                  <div>
                    <h3 className="font-display font-bold text-[#F8F9FA]">
                      {app.venueName}
                    </h3>
                    <p className="text-xs text-[#A0A3BD]">
                      {app.dayOfWeek} • {app.startTime}
                    </p>
                  </div>
                  <Link
                    href={`/nights/${app.nightSlug}`}
                    className="rounded-xl bg-[#FF2E93] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Night Details
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#00E676]/30 bg-[#151525] p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#00E676]">
              <ShieldCheck className="h-4 w-4" />
              <span>Legal Crew Appearance Offers (Ohio Rule 50 Compliant)</span>
            </div>
            <p className="mt-1 text-xs text-[#A0A3BD]">
              Venues can invite {crew.displayName} using only compliant compensation structures:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LEGAL_COMP_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className="rounded-xl border border-white/10 bg-[#0B0B14] p-3 text-xs"
                >
                  <span className="font-bold text-[#F8F9FA]">{opt.label}</span>
                  <p className="mt-0.5 text-[11px] text-[#A0A3BD]">
                    {opt.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HostTipAndFollowBox
            recipientType="crew"
            recipientSlug={crew.slug}
            recipientName={crew.displayName}
            roomCode="CLE-072"
            initialFollowerCount={crew.followerCount}
            initialBalanceCents={2850}
          />
        </div>
      </div>
    </div>
  );
}
