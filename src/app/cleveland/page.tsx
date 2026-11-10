import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";
import { DEFAULT_CITY, DEFAULT_METRO } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function ClevelandDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string; date?: string }>;
}) {
  await syncStoreFromSupabase();
  const verifiedNights = getPublicVerifiedNights();
  const sp = searchParams ? await searchParams : {};
  const initialDate = sp.date ? sp.date.trim() : undefined;
  const defaultDay = sp.day
    ? sp.day.trim()
    : initialDate
    ? "Tonight"
    : "ALL";
  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay={defaultDay}
      initialDate={initialDate}
      pageTitle={`${DEFAULT_CITY} Karaoke & Open Mic Map`}
      pageSubtitle={`Every verified recurring karaoke and open mic night in ${DEFAULT_METRO} — with honest genre-fit per night.`}
    />
  );
}
