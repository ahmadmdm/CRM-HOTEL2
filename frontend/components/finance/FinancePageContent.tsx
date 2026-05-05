"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { unitsApi } from "@/lib/api/units";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getFinanceCategoryLabel, translateFormMessage, useI18n } from "@/lib/i18n";
import { TrendingUp, TrendingDown, DollarSign, Plus, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FinanceCategory } from "@/types";

const EXPENSE_CATEGORIES = [
  "maintenance_cost",
  "cleaning_cost",
  "utilities",
  "supplies",
  "salary",
  "tax",
  "other_expense",
] as const;

const createExpenseSchema = z.object({
  unit_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر"),
  description: z.string().optional(),
  record_date: z.string().min(1, "التاريخ مطلوب"),
});

type CreateExpenseForm = z.infer<typeof createExpenseSchema>;

export function FinancePageContent() {
  const { language, locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<"summary" | "revenue" | "expenses">("summary");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const qc = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: () => financeApi.getSummary(),
  });

  const { data: unitsLookup } = useQuery({
    queryKey: ["finance-unit-options"],
    queryFn: () => unitsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["revenue", { page: 1, page_size: 20 }],
    queryFn: () => financeApi.listRevenue({ page: 1, page_size: 20 }),
    enabled: activeTab === "revenue",
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", { page: 1, page_size: 20 }],
    queryFn: () => financeApi.listExpenses({ page: 1, page_size: 20 }),
    enabled: activeTab === "expenses",
  });

  const createExpenseMutation = useMutation({
    mutationFn: financeApi.createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateExpenseForm>({ resolver: zodResolver(createExpenseSchema) });

  const onExpenseSubmit = async (formData: CreateExpenseForm) => {
    await createExpenseMutation.mutateAsync({
      ...formData,
      unit_id: formData.unit_id || undefined,
    });
    reset();
    setShowAddExpense(false);
  };

  const expenseRows = expenses?.items ?? [];
  const revenueRows = revenue?.items ?? [];
  const topExpenseCategory = useMemo(() => {
    if (expenseRows.length === 0) {
      return null;
    }

    const totals = expenseRows.reduce<Record<string, number>>((accumulator, expense) => {
      accumulator[expense.category] = (accumulator[expense.category] ?? 0) + Number(expense.amount ?? 0);
      return accumulator;
    }, {});

    return Object.entries(totals).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [expenseRows]);

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة المالية", "Finance Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t(
                  "متابعة الإيرادات والمصروفات والنتيجة المالية من شاشة واحدة.",
                  "Track revenue, expenses, and financial outcome from one screen."
                )}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "اعرض الملخص المالي، وسجل المصروفات، وراجع الإيرادات بالقيم المطابقة للواجهة الخلفية.",
                  "Review the financial summary, record expenses, and inspect revenue using values aligned with the backend."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="hero-metric">
              <p className="section-kicker">{t("الإيرادات", "Revenue")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {loadingSummary ? "—" : formatCurrency(summary?.total_revenue ?? 0, "SAR", locale)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي الإيرادات", "Total revenue")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("المصروفات", "Expenses")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {loadingSummary ? "—" : formatCurrency(summary?.total_expenses ?? 0, "SAR", locale)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي المصروفات", "Total expenses")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("الصافي", "Net")}</p>
              <p className={`mt-3 text-3xl font-semibold ${summary && summary.net_profit < 0 ? "text-rose-600" : "text-foreground"}`}>
                {loadingSummary ? "—" : formatCurrency(summary?.net_profit ?? 0, "SAR", locale)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t("صافي النتيجة للفترة الحالية", "Net outcome for the current period")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="toolbar-shell">
        <div className="flex flex-wrap gap-2">
          {(["summary", "revenue", "expenses"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
            >
              {tab === "summary" ? t("الملخص", "Summary") : tab === "revenue" ? t("الإيرادات", "Revenue") : t("المصروفات", "Expenses")}
            </button>
          ))}
        </div>

        <button onClick={() => setShowAddExpense(true)} className="primary-action">
          <Plus className="h-4 w-4" />
          {t("مصروف جديد", "New Expense")}
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-card grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-500/15 bg-emerald-500/6 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("إجمالي الإيرادات", "Total revenue")}</span>
                <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(summary?.total_revenue ?? 0, "SAR", locale)}</p>
            </div>
            <div className="rounded-[24px] border border-rose-500/15 bg-rose-500/6 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("إجمالي المصروفات", "Total expenses")}</span>
                <div className="rounded-2xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-300">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(summary?.total_expenses ?? 0, "SAR", locale)}</p>
            </div>
            <div className="rounded-[24px] border border-sky-500/15 bg-sky-500/6 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("صافي الربح", "Net profit")}</span>
                <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className={`text-2xl font-semibold ${summary && summary.net_profit < 0 ? "text-rose-600" : "text-foreground"}`}>
                {formatCurrency(summary?.net_profit ?? 0, "SAR", locale)}
              </p>
            </div>
          </div>

          <div className="surface-card p-6">
            <p className="section-kicker">{t("ملخص الفترة", "Period Snapshot")}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{t("قراءة سريعة للفترة الحالية", "Quick read for the current period")}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t(
                "أكبر بند مصروف ظاهر حاليًا: {category}.",
                "The largest visible expense category right now is {category}.",
                {
                  category: topExpenseCategory
                    ? getFinanceCategoryLabel(topExpenseCategory as FinanceCategory, language)
                    : t("لا يوجد بعد", "none yet"),
                }
              )}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t(
                "تعرض هذه الصفحة الآن القيم الصحيحة للفئات كما تعتمدها الواجهة الخلفية، لذلك أصبح إدخال المصروفات متوافقًا مع قاعدة البيانات فعليًا.",
                "This page now presents the exact category values used by the backend, so expense entry stays aligned with the real database model."
              )}
            </p>
          </div>
        </div>
      )}

      {activeTab === "revenue" && (
        loadingRevenue ? (
          <div className="data-table-shell p-6 space-y-3">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : revenueRows.length === 0 ? (
          <div className="empty-state">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد إيرادات معروضة بعد", "No revenue records are visible yet")}</h2>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {t(
                "ستظهر هنا سجلات الإيجار والتأمين والرسوم المرتبطة بالحجوزات الحالية.",
                "Rent, deposit, and fee records linked to current bookings will appear here."
              )}
            </p>
          </div>
        ) : (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("النوع", "Type")}</th>
                    <th>{t("المبلغ", "Amount")}</th>
                    <th>{t("التاريخ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueRows.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium text-foreground">{record.unit_id}</td>
                      <td className="text-muted-foreground">{getFinanceCategoryLabel(record.category, language)}</td>
                      <td>
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(record.amount, "SAR", locale)}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{formatDate(record.record_date ?? record.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === "expenses" && (
        loadingExpenses ? (
          <div className="data-table-shell p-6 space-y-3">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : expenseRows.length === 0 ? (
          <div className="empty-state">
            <TrendingDown className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد مصروفات معروضة بعد", "No expense records are visible yet")}</h2>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {t(
                "أضف أول مصروف لتبدأ مراقبة تأثير التشغيل والصيانة والتنظيف على الربحية.",
                "Add the first expense to start monitoring how operations, maintenance, and housekeeping affect profitability."
              )}
            </p>
          </div>
        ) : (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("الوصف", "Description")}</th>
                    <th>{t("الفئة", "Category")}</th>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("المبلغ", "Amount")}</th>
                    <th>{t("التاريخ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium text-foreground">{record.description ?? "—"}</td>
                      <td className="text-muted-foreground">{getFinanceCategoryLabel(record.category, language)}</td>
                      <td className="text-muted-foreground">{record.unit_id ?? t("عام", "General")}</td>
                      <td>
                        <span className="inline-flex rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                          {formatCurrency(record.amount, "SAR", locale)}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{formatDate(record.record_date ?? record.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("إضافة مصروف", "Add Expense")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إضافة مصروف", "Add Expense")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "هذه النافذة ترسل فئات المصروفات المتوافقة مع الـ enum الخلفي مباشرة، بدون قيم قد تُرفض من الخادم.",
                    "This form sends expense categories that match the backend enum directly, without values the server may reject."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onExpenseSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الفئة *", "Category *")}</label>
                  <select {...register("category")} className="input-field">
                    <option value="">{t("اختر الفئة", "Choose a category")}</option>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{getFinanceCategoryLabel(category, language)}</option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.category.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الوحدة", "Unit")}</label>
                  <select {...register("unit_id")} className="input-field">
                    <option value="">{t("مصروف عام", "General expense")}</option>
                    {unitsLookup?.items.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المبلغ *", "Amount *")}</label>
                  <input {...register("amount", { valueAsNumber: true })} type="number" min="0" step="0.01" className="input-field" />
                  {errors.amount && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.amount.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("التاريخ *", "Date *")}</label>
                  <input {...register("record_date")} type="date" className="input-field" />
                  {errors.record_date && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.record_date.message, language)}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("الوصف", "Description")}</label>
                <textarea {...register("description")} rows={3} className="input-field resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpense(false);
                    reset();
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isSubmitting} className="primary-action disabled:opacity-50">
                  {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
