import { UnitsPageContent } from "@/components/units/UnitsPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("units", getRequestLanguage());
}

export default function UnitsPage() {
  return <UnitsPageContent />;
}
