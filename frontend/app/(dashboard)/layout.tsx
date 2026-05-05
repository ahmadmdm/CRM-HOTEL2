import { MobileDock, Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-gradient-to-b from-secondary/85 via-secondary/25 to-transparent" />
      <div className="pointer-events-none absolute left-[-10rem] top-12 -z-10 h-80 w-80 rounded-full bg-primary/15 blur-[110px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-24 -z-10 h-96 w-96 rounded-full bg-cyan-400/12 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-1/3 -z-10 h-80 w-80 rounded-full bg-amber-300/10 blur-[140px]" />

      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
          </main>
          <MobileDock />
        </div>
      </div>
    </div>
  );
}
