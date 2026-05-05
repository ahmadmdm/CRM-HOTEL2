import type { Metadata } from "next";
import { MaintenanceWorkerContent } from "@/components/maintenance/MaintenanceWorkerContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata(): Metadata {
  return buildPageMetadata("maintenance", getRequestLanguage());
}

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <MaintenanceWorkerContent />
    </main>
  );
}
