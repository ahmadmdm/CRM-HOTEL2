import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("dashboard", getRequestLanguage());
}

export default function DashboardPage() {
  return <DashboardOverview />;
}
