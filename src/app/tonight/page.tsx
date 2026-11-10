import { getPublicVerifiedNights, syncStoreFromSupabase } from "@/lib/store";
import { DiscoveryView } from "@/components/DiscoveryView";
import {
  getClevelandCurrentDayOfWeek,
  parseClevelandDateInput,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function TonightPage({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string; date?: string }>;
}) {
  await syncStoreFromSupabase();
  const verifiedNights = getPublicVerifiedNights();
  const sp = searchParams ? await searchParams : {};
  const initialDate = sp.date ? sp.date.trim() : undefined;
  const liveClevelandDay = getClevelandCurrentDayOfWeek(
    initialDate ? parseClevelandDateInput(initialDate) : new Date()
  );
  const defaultDay = sp.day ? sp.day.trim() : "Tonight";

  return (
    <DiscoveryView
      initialNights={verifiedNights}
      defaultDay={defaultDay}
      initialDate={initialDate}
      pageTitle={`Happening Tonight (${liveClevelandDay}) in Greater Cleveland`}
      pageSubtitle={`Live ${liveClevelandDay} stages in Greater Cleveland (America/New_York) plus full-week verified directory filter.`}
    />
  );
}
