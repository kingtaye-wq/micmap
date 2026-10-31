import Link from "next/link";
import { notFound } from "next/navigation";
import { syncStoreFromSupabase } from "@/lib/store";
import { APP_NAME, APP_DOMAIN } from "@/config/brand";
import { HostTipAndFollowBox } from "@/components/HostTipAndFollowBox";
import { Music, Calendar, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await syncStoreFromSupabase();
  const artist =
    store.artistsAndCrews.find((a) => a.slug === slug && a.kind === "artist") ||
    store.artistsAndCrews.find((a) => a.kind === "artist");

  if (!artist) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-[#151525] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[#00F0FF]">
          <Sparkles className="h-4 w-4" />
          <span>
            {APP_NAME} ({APP_DOMAIN}) • Performer Profile
          </span>
        </div>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#F8F9FA] sm:text-4xl">
          {artist.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A0A3BD]">{artist.bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {artist.genres.map((g) => (
            <span
              key={g}
              className="rounded-full bg-[#FF2E93]/20 px-3 py-1 text-xs font-bold text-[#FF2E93]"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-[#151525] p-6">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold text-[#F8F9FA]">
              <Calendar className="h-5 w-5 text-[#00F0FF]" />
              <span>Upcoming Cleveland Appearances</span>
            </h2>
            <div className="mt-4 space-y-3">
              {artist.upcomingAppearances.map((app) => (
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
                    className="rounded-xl bg-[#00F0FF] px-3 py-1.5 text-xs font-bold text-[#0B0B14]"
                  >
                    View Night
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151525] p-5 text-xs text-[#A0A3BD]">
            <Music className="mb-1 h-4 w-4 text-[#FF2E93]" />
            Raw Draw Telemetry Collected (v1.5 Draw Score Pipeline):{" "}
            <strong className="text-[#F8F9FA]">{artist.rawRsvpCount} RSVPs</strong> •{" "}
            <strong className="text-[#F8F9FA]">
              {artist.rawCheckinCount} Verified Check-Ins
            </strong>{" "}
            •{" "}
            <strong className="text-[#F8F9FA]">
              {artist.venueConfirmationsCount} Venue Confirmations
            </strong>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HostTipAndFollowBox
            recipientType="artist"
            recipientSlug={artist.slug}
            recipientName={artist.displayName}
            roomCode="CLE-072"
            initialFollowerCount={artist.followerCount}
            initialBalanceCents={1425}
          />
        </div>
      </div>
    </div>
  );
}
