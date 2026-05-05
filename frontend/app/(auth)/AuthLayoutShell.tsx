"use client";

import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="absolute inset-x-4 top-4 z-20 flex justify-end sm:inset-x-6 lg:inset-x-10">
        <LanguageToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-panel relative hidden overflow-hidden px-8 py-8 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute right-[-3rem] top-[-2rem] h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-4rem] left-[-3rem] h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/55 px-4 py-2 text-xs font-semibold text-foreground dark:border-white/10 dark:bg-white/5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("منصة تشغيل موحدة للوحدات والإيجارات", "A unified platform for units and rental operations")}
            </div>

            <div className="space-y-4">
              <p className="section-kicker">{t("نظام إدارة الوحدات", "Units Management System")}</p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.1] text-foreground">
                {t(
                  "إدارة الحجوزات والوحدات والمالية من شاشة موحدة.",
                  "Manage bookings, units, and finance from one unified workspace."
                )}
              </h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                {t(
                  "الدخول يوصلك إلى المسار المناسب حسب الدور مع نفس بيانات المشروع التشغيلية.",
                  "Sign in once and continue to the right workspace for your role with the same live project data."
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="surface-card p-5">
                <p className="section-kicker">{t("الإشغال", "Occupancy")}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">98%</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("متابعة لحظية للحجوزات والحالات التشغيلية.", "Live visibility into bookings and operational status.")}
                </p>
              </div>
              <div className="surface-card p-5">
                <p className="section-kicker">{t("العمليات", "Operations")}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">24/7</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(
                    "مسارات واضحة لفِرق التشغيل والصيانة والتنظيف.",
                    "Clear workflows for operations, maintenance, and housekeeping teams."
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-4">
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">{t("الوحدات", "Units")}</p>
              <p className="mt-2 text-lg font-semibold">{t("حالة الوحدات", "Unit status")}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">{t("المالية", "Finance")}</p>
              <p className="mt-2 text-lg font-semibold">{t("ملخص مالي", "Financial summary")}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">{t("العمليات", "Operations")}</p>
              <p className="mt-2 text-lg font-semibold">{t("متابعة العمليات", "Operational follow-up")}</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}