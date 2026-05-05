"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsApi } from "@/lib/api/operations";
import { useAuthStore } from "@/stores/authStore";
import type { CleaningTask } from "@/types";
import { Brush, CheckCircle, Clock, LogOut, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { toast } from "@/components/ui/toaster";

export function HousekeepingContent() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const { locale, t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["my-cleaning-tasks"],
    queryFn: () => operationsApi.getMyCleaningTasks(),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      operationsApi.updateCleaningStatus(id, { status: "done" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-cleaning-tasks"] });
      toast({ title: t("تم تحديث المهمة", "Task updated"), description: t("سُجلت المهمة كمنجزة.", "The task was recorded as completed.") });
    },
    onError: () => {
      toast({
        title: t("تعذر تحديث المهمة", "Unable to update task"),
        description: t("لم يتم حفظ حالة المهمة. حاول مرة أخرى.", "The task status was not saved. Please try again."),
        variant: "destructive",
      });
    },
  });

  const pendingTasks = (data as CleaningTask[] | undefined)?.filter((t: CleaningTask) => t.status !== "done") ?? [];
  const doneTasks = (data as CleaningTask[] | undefined)?.filter((t: CleaningTask) => t.status === "done") ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <section className="surface-panel overflow-hidden">
        <div className="bg-slate-950 px-5 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                <Brush className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="section-kicker text-white/50">{t("وضع التنظيف", "Housekeeping Mode")}</p>
                <h1 className="mt-1 text-xl font-semibold leading-tight">{t("مهام التنظيف", "Housekeeping Tasks")}</h1>
                <p className="mt-1 text-sm text-white/60">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={() => {
                  void logout();
                }}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/65 transition-all hover:text-white"
                title={t("تسجيل الخروج", "Log out")}
                aria-label={t("تسجيل الخروج", "Log out")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {t("تجربة مبسطة ومهيأة للجوال", "A simplified, mobile-ready experience")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="surface-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingTasks.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("معلقة", "Pending")}</p>
          </div>
          <div className="surface-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{doneTasks.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("منجزة", "Completed")}</p>
          </div>
        </div>
      </section>

      <div className="space-y-3 pb-8">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-[28px] bg-muted animate-pulse" />
          ))
        ) : pendingTasks.length === 0 ? (
          <div className="surface-card py-12 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
            <p className="font-medium text-emerald-600">{t("تم إنجاز جميع المهام!", "All tasks are completed!")}</p>
          </div>
        ) : (
          pendingTasks.map((task: CleaningTask) => (
            <div
              key={task.id}
              className="surface-card p-4"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {task.unit?.code ?? task.unit_id}
                  </p>
                  {task.scheduled_date && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.scheduled_date, locale)}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {t("معلق", "Pending")}
                </span>
              </div>
              <button
                onClick={() => updateMutation.mutate(task.id)}
                disabled={updateMutation.isPending}
                className="w-full rounded-[20px] bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-base font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {updateMutation.isPending ? t("جاري التحديث...", "Updating...") : t("✓ تم التنظيف", "✓ Cleaning Done")}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
