import { getPublicVerifiedNights } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const verifiedNights = getPublicVerifiedNights();
  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay="ALL"
      pageTitle="Find your crowd tonight"
    />
  );
}
