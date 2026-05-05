import type { Metadata, Viewport } from "next";
import { HousekeepingContent } from "@/components/housekeeping/HousekeepingContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata(): Metadata {
  return buildPageMetadata("housekeeping", getRequestLanguage());
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function HousekeepingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <HousekeepingContent />
    </main>
  );
}
