"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsApi } from "@/lib/api/operations";
import { unitsApi } from "@/lib/api/units";
import { formatDate } from "@/lib/utils";
import { getTicketPriorityLabel, getTicketStatusLabel, getUnitStatusLabel, translateFormMessage, useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import type { CleaningTask, MaintenanceTicket, UnitStatus } from "@/types";
import { Brush, Wrench, CheckCircle, Clock, AlertTriangle, Plus, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createCleaningSchema = z.object({
  unit_id: z.string().uuid("يرجى اختيار وحدة صحيحة"),
  notes: z.string().max(500, "الملاحظات طويلة أكثر من اللازم").optional(),
});

const createTicketSchema = z.object({
  unit_id: z.string().uuid("يرجى اختيار وحدة صحيحة"),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

type CreateCleaningForm = z.infer<typeof createCleaningSchema>;
type CreateTicketForm = z.infer<typeof createTicketSchema>;

const PRIORITY_META: Record<string, { classes: string }> = {
  low: { classes: "bg-slate-100 text-slate-600" },
  medium: { classes: "bg-blue-100 text-blue-700" },
  high: { classes: "bg-amber-100 text-amber-700" },
  urgent: { classes: "bg-red-100 text-red-700" },
};

const TICKET_STATUS_META: Record<string, { classes: string }> = {
  open: { classes: "bg-amber-100 text-amber-700" },
  in_progress: { classes: "bg-blue-100 text-blue-700" },
  resolved: { classes: "bg-emerald-100 text-emerald-700" },
  closed: { classes: "bg-slate-100 text-slate-600" },
};

export function OperationsPageContent() {
  const { language, locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<"cleaning" | "maintenance">("cleaning");
  const [createMode, setCreateMode] = useState<"cleaning" | "maintenance" | null>(null);
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();

  const role = user?.role ?? null;
  const canCreateCleaningTask = role === "super_admin" || role === "sub_admin" || role === "operations";
  const canUpdateCleaningStatus = role === "super_admin" || role === "sub_admin";
  const canCreateMaintenanceTicket =
    role === "super_admin" ||
    role === "sub_admin" ||
    role === "operations" ||
    role === "maintenance";
  const canUpdateMaintenanceStatus =
    role === "super_admin" || role === "sub_admin" || role === "maintenance";

  const { data: unitsLookup } = useQuery({
    queryKey: ["operations-unit-options"],
    queryFn: () => unitsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: cleaningTasks, isLoading: loadingCleaning } = useQuery({
    queryKey: ["cleaning-tasks"],
    queryFn: () => operationsApi.listCleaningTasks({ page: 1, page_size: 50 }),
  });

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["maintenance-tickets"],
    queryFn: () => operationsApi.listMaintenanceTickets({ page: 1, page_size: 50 }),
  });

  const createCleaningMutation = useMutation({
    mutationFn: operationsApi.createCleaningTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cleaning-tasks"] });
      qc.invalidateQueries({ queryKey: ["my-cleaning-tasks"] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: operationsApi.createMaintenanceTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance-tickets"] }),
  });

  const updateCleaningMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      operationsApi.updateCleaningStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaning-tasks"] }),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      operationsApi.updateMaintenanceStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance-tickets"] }),
  });

  const {
    register: registerCleaning,
    handleSubmit: handleSubmitCleaning,
    reset: resetCleaning,
    formState: { errors: cleaningErrors, isSubmitting: isSubmittingCleaning },
  } = useForm<CreateCleaningForm>({ resolver: zodResolver(createCleaningSchema) });

  const {
    register: registerTicket,
    handleSubmit: handleSubmitTicket,
    reset: resetTicket,
    formState: { errors: ticketErrors, isSubmitting: isSubmittingTicket },
  } = useForm<CreateTicketForm>({ resolver: zodResolver(createTicketSchema) });

  const onCleaningSubmit = async (data: CreateCleaningForm) => {
    await createCleaningMutation.mutateAsync(data);
    resetCleaning();
    setCreateMode(null);
  };

  const onTicketSubmit = async (data: CreateTicketForm) => {
    await createTicketMutation.mutateAsync(data);
    resetTicket();
    setCreateMode(null);
  };

  const cleaningItems = cleaningTasks?.items ?? [];
  const ticketItems = tickets?.items ?? [];
  const pendingCleaning = cleaningItems.filter((task) => task.status !== "done").length;
  const inProgressTickets = ticketItems.filter((ticket) => ticket.status === "in_progress").length;
  const urgentTickets = ticketItems.filter((ticket) => ticket.priority === "urgent").length;

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة العمليات", "Operations Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t(
                  "متابعة التنظيف والصيانة والطلبات العاجلة من شاشة تشغيل واحدة.",
                  "Track housekeeping, maintenance, and urgent requests from one operations screen."
                )}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "اعرض مهام التنظيف، وتذاكر الصيانة، والأولويات المفتوحة، ونفذ الإجراءات اليومية من نفس الواجهة.",
                  "Review housekeeping tasks, maintenance tickets, and open priorities, then execute daily actions from the same interface."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="hero-metric">
              <p className="section-kicker">{t("مهام التنظيف", "Housekeeping Tasks")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{pendingCleaning}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("مهام تنظيف غير منتهية", "Open housekeeping tasks")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("قيد المعالجة", "In Progress")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{inProgressTickets}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("تذاكر صيانة قيد المعالجة", "Maintenance tickets being handled")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("عاجلة", "Urgent")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{urgentTickets}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("أولوية عاجلة مفتوحة", "Open urgent priorities")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="toolbar-shell">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("cleaning")}
            className={activeTab === "cleaning" ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
          >
            <Brush className="h-3.5 w-3.5" /> {t("التنظيف", "Housekeeping")}
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={activeTab === "maintenance" ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
          >
            <Wrench className="h-3.5 w-3.5" /> {t("الصيانة", "Maintenance")}
          </button>
        </div>

        {activeTab === "cleaning" && canCreateCleaningTask && (
          <button onClick={() => setCreateMode("cleaning")} className="primary-action">
            <Plus className="h-4 w-4" />
            {t("طلب تنظيف", "Cleaning Request")}
          </button>
        )}

        {activeTab === "maintenance" && canCreateMaintenanceTicket && (
          <button onClick={() => setCreateMode("maintenance")} className="primary-action">
            <Plus className="h-4 w-4" />
            {t("تذكرة صيانة", "Maintenance Ticket")}
          </button>
        )}
      </div>

      {activeTab === "cleaning" && (
        <div className="data-table-shell">
          {loadingCleaning ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : cleaningItems.length === 0 ? (
            <div className="empty-state">
              <Brush className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">{t("لا توجد مهام تنظيف الآن", "There are no housekeeping tasks right now")}</h2>
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                {t(
                  "ستظهر هنا المهام الناتجة عن تسجيل الخروج أو الإنشاء اليدوي لمهام التنظيف.",
                  "Tasks generated by checkout or by manual housekeeping requests will appear here."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("آخر تحديث", "Last Updated")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningItems.map((task: CleaningTask) => (
                    <tr key={task.id}>
                      <td className="font-medium text-foreground">{task.unit?.code ?? task.unit_id}</td>
                      <td className="text-muted-foreground">{formatDate(task.updated_at, locale)}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          task.status === "done"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : task.status === "in_progress"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}>
                          {task.status === "done" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {task.status === "done" ? t("منتهي", "Done") : task.status === "in_progress" ? t("جاري", "In Progress") : t("معلق", "Pending")}
                        </span>
                      </td>
                      <td>
                        {task.status !== "done" && canUpdateCleaningStatus && (
                          <button
                            onClick={() => updateCleaningMutation.mutate({ id: task.id, status: "done" })}
                            className="secondary-action px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                          >
                            {t("تم التنظيف", "Cleaning Completed")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="data-table-shell">
          {loadingTickets ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : ticketItems.length === 0 ? (
            <div className="empty-state">
              <Wrench className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">{t("لا توجد تذاكر صيانة حاليًا", "There are no maintenance tickets right now")}</h2>
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                {t(
                  "أنشئ أول تذكرة لتبدأ مراقبة الأعطال والأعمال الجارية من واجهة واحدة.",
                  "Create the first ticket to start tracking faults and active work from one interface."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("العنوان", "Title")}</th>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("الأولوية", "Priority")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketItems.map((ticket: MaintenanceTicket) => (
                    <tr key={ticket.id}>
                      <td>
                        <div className="font-medium text-foreground">{ticket.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{ticket.description || t("بدون وصف إضافي", "No additional description")}</div>
                      </td>
                      <td className="text-muted-foreground">{ticket.unit?.code ?? "—"}</td>
                      <td>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_META[ticket.priority]?.classes}`}>
                          {getTicketPriorityLabel(ticket.priority, language)}
                        </span>
                      </td>
                      <td>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TICKET_STATUS_META[ticket.status]?.classes}`}>
                          {getTicketStatusLabel(ticket.status, language)}
                        </span>
                      </td>
                      <td>
                        {ticket.status === "open" && canUpdateMaintenanceStatus && (
                          <button
                            onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: "in_progress" })}
                            className="secondary-action px-3 py-2 text-xs text-sky-700 dark:text-sky-300"
                          >
                            {t("بدء العمل", "Start Work")}
                          </button>
                        )}
                        {ticket.status === "in_progress" && canUpdateMaintenanceStatus && (
                          <button
                            onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: "resolved" })}
                            className="secondary-action px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                          >
                            {t("تم الحل", "Resolved")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {createMode === "cleaning" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("طلب تنظيف", "Cleaning Request")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("طلب تنظيف جديد", "New Cleaning Request")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "الطلب سيظهر مباشرة في قائمة العمليات، وإذا تُرك بلا تعيين فسيراه فريق التنظيف ضمن الطابور المشترك عند تسجيل الدخول.",
                    "The request will appear immediately in the operations list. If left unassigned, the housekeeping team will see it in the shared queue when they sign in."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <Brush className="h-5 w-5" />
              </div>
            </div>
            <form onSubmit={handleSubmitCleaning(onCleaningSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("الوحدة *", "Unit *")}</label>
                <select {...registerCleaning("unit_id")} className="input-field">
                  <option value="">{t("اختر الوحدة", "Choose a unit")}</option>
                  {unitsLookup?.items.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} - {unit.name} ({getUnitStatusLabel(unit.status as UnitStatus, language)})
                    </option>
                  ))}
                </select>
                {cleaningErrors.unit_id && <p className="text-red-500 text-xs mt-1">{translateFormMessage(cleaningErrors.unit_id.message, language)}</p>}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("ملاحظات الطلب", "Request Notes")}</label>
                <textarea
                  {...registerCleaning("notes")}
                  rows={3}
                  className="input-field resize-none"
                  placeholder={t("مثال: تنظيف سريع قبل معاينة العميل أو بعد خروج مفاجئ", "Example: quick cleaning before a customer viewing or after an unexpected checkout")}
                />
                {cleaningErrors.notes && <p className="text-red-500 text-xs mt-1">{translateFormMessage(cleaningErrors.notes.message, language)}</p>}
              </div>
              <div className="rounded-[20px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {t(
                  "إذا كانت الوحدة أصلًا في حالة \"بانتظار تنظيف\" فإغلاق المهمة سيعيدها تلقائيًا إلى \"جاهزة\". في غير ذلك تُسجل المهمة كتتبع تشغيلي بدون تغيير دورة الحالة.",
                  "If the unit is already in the \"waiting for cleaning\" state, closing the task will automatically return it to \"ready\". Otherwise, the task is recorded as operational tracking without changing the status lifecycle."
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(null);
                    resetCleaning();
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCleaning}
                  className="primary-action disabled:opacity-50"
                >
                  {isSubmittingCleaning ? t("جاري الحفظ...", "Saving...") : t("إرسال الطلب", "Submit Request")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createMode === "maintenance" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("تذكرة صيانة", "Maintenance Ticket")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("تذكرة صيانة جديدة", "New Maintenance Ticket")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "اختر الوحدة من القائمة مباشرة بدل إدخال المعرف يدويًا، وحدد أولوية التدخل من نفس النموذج.",
                    "Choose the unit directly from the list instead of entering an ID manually, and set the intervention priority from the same form."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <form onSubmit={handleSubmitTicket(onTicketSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("الوحدة *", "Unit *")}</label>
                <select {...registerTicket("unit_id")} className="input-field">
                  <option value="">{t("اختر الوحدة", "Choose a unit")}</option>
                  {unitsLookup?.items.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                  ))}
                </select>
                {ticketErrors.unit_id && <p className="text-red-500 text-xs mt-1">{translateFormMessage(ticketErrors.unit_id.message, language)}</p>}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("العنوان *", "Title *")}</label>
                <input {...registerTicket("title")} className="input-field" />
                {ticketErrors.title && <p className="text-red-500 text-xs mt-1">{translateFormMessage(ticketErrors.title.message, language)}</p>}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("الأولوية", "Priority")}</label>
                <select {...registerTicket("priority")} className="input-field">
                  <option value="low">{getTicketPriorityLabel("low", language)}</option>
                  <option value="medium">{getTicketPriorityLabel("medium", language)}</option>
                  <option value="high">{getTicketPriorityLabel("high", language)}</option>
                  <option value="urgent">{getTicketPriorityLabel("urgent", language)}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("الوصف", "Description")}</label>
                <textarea {...registerTicket("description")} rows={3} className="input-field resize-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(null);
                    resetTicket();
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="primary-action disabled:opacity-50"
                >
                  {isSubmittingTicket ? t("جاري الحفظ...", "Saving...") : t("إرسال", "Submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
