import { AdminConsoleView } from "@/components/AdminConsoleView";

export const dynamic = "force-dynamic";

export default function AdminStaleQueuePage() {
  return <AdminConsoleView defaultTab="stale" />;
}
