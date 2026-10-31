import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  await syncStoreFromSupabase();
  const verifiedNights = getPublicVerifiedNights();
  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay="ALL"
      pageTitle="Greater Cleveland Interactive Stage Map"
    />
  );
}
