import { UsersPageContent } from "@/components/users/UsersPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("users", getRequestLanguage());
}

export default function UsersPage() {
  return <UsersPageContent />;
}
