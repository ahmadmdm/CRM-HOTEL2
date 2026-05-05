import { CustomersPageContent } from "@/components/customers/CustomersPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("customers", getRequestLanguage());
}

export default function CustomersPage() {
  return <CustomersPageContent />;
}
