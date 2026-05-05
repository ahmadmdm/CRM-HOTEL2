import { OperationsPageContent } from "@/components/operations/OperationsPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("operations", getRequestLanguage());
}

export default function OperationsPage() {
  return <OperationsPageContent />;
}
