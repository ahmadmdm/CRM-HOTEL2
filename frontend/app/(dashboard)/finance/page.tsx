import { FinancePageContent } from "@/components/finance/FinancePageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("finance", getRequestLanguage());
}

export default function FinancePage() {
  return <FinancePageContent />;
}
