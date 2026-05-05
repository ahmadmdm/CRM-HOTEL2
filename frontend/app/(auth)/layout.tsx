import { AuthLayoutShell } from "./AuthLayoutShell";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("login", getRequestLanguage());
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
