"use client";

import Link from "next/link";
import { getUnitStatusLabel, useI18n } from "@/lib/i18n";
import { useUnitStatusSummary } from "@/hooks/useUnits";
import { useBookings } from "@/hooks/useBookings";
import { StatsCard } from "./StatsCard";
import { OccupancyChart } from "./OccupancyChart";
import { RecentBookings } from "./RecentBookings";
import { ArrowUpRight, Building2, CalendarDays, RefreshCcw, TrendingUp, Wrench } from "lucide-react";

const WIDTH_CLASS_MAP: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-1/2",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-3/4",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

function getPercentageWidthClass(percentage: number) {
  const bucket = Math.max(0, Math.min(100, Math.round(percentage / 5) * 5));
  return WIDTH_CLASS_MAP[bucket] ?? "w-0";
}

export function DashboardOverview() {
  const { language, t } = useI18n();
  const statusQuery = useUnitStatusSummary();
  const bookingsQuery = useBookings({
    page: 1,
    page_size: 5,
  });

  const statusSummary = statusQuery.data;
  const bookings = bookingsQuery.data;
  const loadingUnits = statusQuery.isLoading;
  const loadingBookings = bookingsQuery.isLoading;
  const hasErrors = statusQuery.isError || bookingsQuery.isError;

  const totalUnits = statusSummary
    ? Object.values(statusSummary).reduce((a, b) => a + b, 0)
    : 0;
  const occupied = statusSummary?.occupied ?? 0;
  const occupancyRate =
    totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;

  const handleRetry = () => {
    void statusQuery.refetch();
    void bookingsQuery.refetch();
  };

  return (
    <div className="space-y-8">
      <section className="surface-panel relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="section-kicker">{t("ملخص التشغيل", "Operational Snapshot")}</p>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              {t(
                "متابعة حالة الوحدات والحجوزات والجاهزية التشغيلية من شاشة واحدة.",
                "Track unit status, bookings, and operational readiness from one screen."
              )}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {t(
                "متابعة آنية لنِسب الإشغال، الجاهزية التشغيلية، والحجوزات مع وصول سريع لأهم مسارات العمل اليومية.",
                "Get a live view of occupancy, operational readiness, and bookings with quick access to the work that matters today."
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/units" className="filter-chip flex items-center gap-2 text-foreground hover:-translate-y-0.5">
              {t("الوحدات", "Units")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/bookings" className="filter-chip flex items-center gap-2 text-foreground hover:-translate-y-0.5">
              {t("الحجوزات", "Bookings")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/finance" className="filter-chip flex items-center gap-2 text-foreground hover:-translate-y-0.5">
              {t("المالية", "Finance")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {hasErrors && (
        <div className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("تعذر تحديث بعض بيانات لوحة القيادة", "Some dashboard data could not be refreshed")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "الواجهة بقيت متاحة، لكن بعض المؤشرات تحتاج إعادة جلب من الخادم.",
                "The workspace is still available, but a few indicators need to be fetched again from the server."
              )}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="filter-chip flex items-center justify-center gap-2 text-foreground hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("إجمالي الوحدات", "Total Units")}
          value={totalUnits}
          icon={Building2}
          color="blue"
          loading={loadingUnits}
        />
        <StatsCard
          title={t("نسبة الإشغال", "Occupancy Rate")}
          value={`${occupancyRate}%`}
          icon={TrendingUp}
          color="emerald"
          loading={loadingUnits}
          sub={t("{count} وحدة مشغولة", "{count} occupied units", { count: occupied })}
        />
        <StatsCard
          title={t("بانتظار التنظيف", "Waiting for Cleaning")}
          value={statusSummary?.waiting_cleaning ?? 0}
          icon={Wrench}
          color="amber"
          loading={loadingUnits}
        />
        <StatsCard
          title={t("إجمالي الحجوزات", "Total Bookings")}
          value={bookings?.total ?? 0}
          icon={CalendarDays}
          color="purple"
          loading={loadingBookings}
        />
      </div>

      {statusSummary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OccupancyChart statusSummary={statusSummary} />
          </div>
          <div>
            <UnitStatusBreakdown statusSummary={statusSummary} total={totalUnits} />
          </div>
        </div>
      )}

      <RecentBookings bookings={bookings?.items ?? []} loading={loadingBookings} />
    </div>
  );
}

function UnitStatusBreakdown({
  statusSummary,
  total,
}: {
  statusSummary: Record<string, number>;
  total: number;
}) {
  const { language, t } = useI18n();

  const STATUS_META: Record<string, { label: string; color: string }> = {
    vacant: { label: getUnitStatusLabel("vacant", language), color: "bg-slate-400" },
    ready: { label: getUnitStatusLabel("ready", language), color: "bg-emerald-500" },
    reserved: { label: getUnitStatusLabel("reserved", language), color: "bg-sky-500" },
    occupied: { label: getUnitStatusLabel("occupied", language), color: "bg-fuchsia-500" },
    waiting_cleaning: { label: getUnitStatusLabel("waiting_cleaning", language), color: "bg-amber-500" },
    maintenance: { label: t("تحت الصيانة", "Under Maintenance"), color: "bg-rose-500" },
  };

  return (
    <div className="surface-card p-6">
      <p className="section-kicker">{t("توزيع الحالات", "Status Breakdown")}</p>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{t("توزيع الوحدات", "Unit Distribution")}</h3>
      <div className="space-y-3">
        {Object.entries(STATUS_META).map(([key, { label, color }]) => {
          const count = statusSummary[key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key} className="rounded-[22px] border border-white/35 bg-white/50 p-3 dark:border-white/5 dark:bg-white/5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/80">
                <div
                  className={`${color} h-full rounded-full transition-all duration-700 ${getPercentageWidthClass(pct)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
