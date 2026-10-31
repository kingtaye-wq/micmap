import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";

export const dynamic = "force-dynamic";

export default async function TonightPage() {
  await syncStoreFromSupabase();
  const verifiedNights = getPublicVerifiedNights();
  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay="Friday"
      pageTitle="Happening Tonight in Greater Cleveland"
      pageSubtitle="Live Friday stages plus full-week verified directory filter."
    />
  );
}
