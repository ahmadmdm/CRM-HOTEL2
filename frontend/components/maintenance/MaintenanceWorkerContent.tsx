"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsApi } from "@/lib/api/operations";
import { useAuthStore } from "@/stores/authStore";
import type { MaintenanceTicket } from "@/types";
import { Wrench, LogOut, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { getTicketPriorityLabel, useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { toast } from "@/components/ui/toaster";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export function MaintenanceWorkerContent() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const { language, t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => operationsApi.listMaintenanceTickets({ page: 1, page_size: 50 }),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      operationsApi.updateMaintenanceStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast({ title: t("تم تحديث التذكرة", "Ticket updated"), description: t("جرت مزامنة حالة التذكرة بنجاح.", "The ticket status was synced successfully.") });
    },
    onError: () => {
      toast({
        title: t("تعذر تحديث التذكرة", "Unable to update ticket"),
        description: t("لم يتم حفظ حالة التذكرة. حاول مرة أخرى.", "The ticket status was not saved. Please try again."),
        variant: "destructive",
      });
    },
  });

  const open = data?.items.filter((t: MaintenanceTicket) => t.status === "open") ?? [];
  const inProgress = data?.items.filter((t: MaintenanceTicket) => t.status === "in_progress") ?? [];

  const actionableTasks = [...inProgress, ...open];

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <section className="surface-panel overflow-hidden">
        <div className="bg-slate-950 px-5 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
                <Wrench className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <p className="section-kicker text-white/50">{t("وضع الصيانة", "Maintenance Mode")}</p>
                <h1 className="mt-1 text-xl font-semibold leading-tight">{t("تذاكر الصيانة", "Maintenance Tickets")}</h1>
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
            {t("واجهة ميدانية سريعة للاستلام والإغلاق", "A fast field interface for accepting and closing tickets")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="surface-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{open.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("مفتوحة", "Open")}</p>
          </div>
          <div className="surface-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("قيد التنفيذ", "In Progress")}</p>
          </div>
        </div>
      </section>

      <div className="space-y-3 pb-8">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-[28px] bg-muted animate-pulse" />
          ))
        ) : actionableTasks.length === 0 ? (
          <div className="surface-card py-12 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
            <p className="font-medium text-emerald-600">{t("لا توجد تذاكر معلقة", "There are no pending tickets")}</p>
          </div>
        ) : (
          actionableTasks.map((ticket: MaintenanceTicket) => (
            <div key={ticket.id} className="surface-card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-bold text-foreground">{ticket.title}</p>
                    {ticket.priority === "urgent" && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.unit?.code ?? "—"}</p>
                  {ticket.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                  {getTicketPriorityLabel(ticket.priority, language)}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {ticket.status === "open" && (
                  <button
                    onClick={() => updateMutation.mutate({ id: ticket.id, status: "in_progress" })}
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-[20px] bg-gradient-to-r from-blue-500 to-cyan-400 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {t("بدء العمل", "Start Work")}
                  </button>
                )}
                {ticket.status === "in_progress" && (
                  <button
                    onClick={() => updateMutation.mutate({ id: ticket.id, status: "resolved" })}
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-[20px] bg-gradient-to-r from-emerald-500 to-lime-400 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {t("✓ تم الحل", "✓ Resolved")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
