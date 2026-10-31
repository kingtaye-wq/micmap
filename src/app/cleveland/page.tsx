import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";
import { DEFAULT_CITY, DEFAULT_METRO } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function ClevelandDirectoryPage() {
  await syncStoreFromSupabase();
  const verifiedNights = getPublicVerifiedNights();
  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay="ALL"
      pageTitle={`${DEFAULT_CITY} Karaoke & Open Mic Map`}
      pageSubtitle={`Every verified recurring karaoke and open mic night in ${DEFAULT_METRO} — with honest genre-fit per night.`}
    />
  );
}
