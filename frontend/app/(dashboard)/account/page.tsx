import { AccountSecurityPageContent } from "@/components/account/AccountSecurityPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("account", getRequestLanguage());
}

export default function AccountPage() {
  return <AccountSecurityPageContent />;
}