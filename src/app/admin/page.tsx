import { AdminConsoleView } from "@/components/AdminConsoleView";

export const dynamic = "force-dynamic";

export default function AdminRootPage() {
  return <AdminConsoleView defaultTab="verification" />;
}
