"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { managementApi } from "@/lib/api/management";
import { unitsApi } from "@/lib/api/units";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getFinanceCategoryLabel, translateFormMessage, useI18n } from "@/lib/i18n";
import { AlertTriangle, BookOpen, Building2, CheckCircle2, FileText, Landmark, Percent, ReceiptText, TrendingUp, TrendingDown, DollarSign, Plus, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Account, AccountType, ContractStatus, FinanceCategory, UnitManagementContract, UnitSummary } from "@/types";

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

const ownerStatementSchema = z.object({
  owner_id: z.string().uuid("المالك مطلوب"),
  period_start: z.string().min(1, "بداية الفترة مطلوبة"),
  period_end: z.string().min(1, "نهاية الفترة مطلوبة"),
});

type OwnerStatementForm = z.infer<typeof ownerStatementSchema>;

const ACCOUNT_TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const manualJournalSchema = z.object({
  entry_date: z.string().min(1, "تاريخ القيد مطلوب"),
  description: z.string().min(3, "وصف القيد مطلوب"),
  debit_account_id: z.string().uuid("حساب المدين مطلوب"),
  credit_account_id: z.string().uuid("حساب الدائن مطلوب"),
  amount: z.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر"),
  unit_id: z.string().uuid().optional().or(z.literal("")),
  line_description: z.string().optional(),
}).refine((value) => value.debit_account_id !== value.credit_account_id, {
  path: ["credit_account_id"],
  message: "لا يمكن اختيار الحساب نفسه للمدين والدائن",
});

type ManualJournalForm = z.infer<typeof manualJournalSchema>;

const CONTRACT_STATUSES = ["active", "paused", "ended"] as const;

const managementContractSchema = z.object({
  unit_id: z.string().uuid("الوحدة مطلوبة"),
  owner_id: z.string().uuid("المالك مطلوب"),
  management_entity_id: z.string().uuid("الإدارة مطلوبة"),
  property_group_id: z.string().optional(),
  starts_on: z.string().min(1, "تاريخ البداية مطلوب"),
  ends_on: z.string().optional(),
  admin_fee_percent: z.number().min(0, "النسبة لا تقل عن صفر").max(100, "النسبة لا تزيد عن 100"),
  status: z.enum(CONTRACT_STATUSES),
  notes: z.string().optional(),
});

type ManagementContractForm = z.infer<typeof managementContractSchema>;
type ContractModalContext = { unitId: string; contractId?: string | null };
type FinanceTab = "summary" | "revenue" | "expenses" | "invoices" | "accounting" | "contracts" | "owners";

export function FinancePageContent() {
  const { language, locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<FinanceTab>("summary");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showOwnerStatement, setShowOwnerStatement] = useState(false);
  const [showManualJournal, setShowManualJournal] = useState(false);
  const [contractModalContext, setContractModalContext] = useState<ContractModalContext | null>(null);
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

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices", { page: 1, page_size: 20, recipient_type: "customer" }],
    queryFn: () => financeApi.listInvoices({ page: 1, page_size: 20, recipient_type: "customer" }),
    enabled: activeTab === "invoices",
  });

  const { data: ownerStatements, isLoading: loadingOwnerStatements } = useQuery({
    queryKey: ["invoices", { page: 1, page_size: 20, recipient_type: "owner" }],
    queryFn: () => financeApi.listInvoices({ page: 1, page_size: 20, recipient_type: "owner" }),
    enabled: activeTab === "owners",
  });

  const { data: journalEntries, isLoading: loadingJournalEntries } = useQuery({
    queryKey: ["journal-entries", { page: 1, page_size: 12 }],
    queryFn: () => financeApi.listJournalEntries({ page: 1, page_size: 12 }),
    enabled: activeTab === "accounting",
  });

  const { data: trialBalance, isLoading: loadingTrialBalance } = useQuery({
    queryKey: ["trial-balance"],
    queryFn: () => financeApi.getTrialBalance(),
    enabled: activeTab === "accounting",
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeApi.listAccounts(),
    enabled: activeTab === "accounting",
  });

  const { data: managementContracts, isLoading: loadingManagementContracts } = useQuery({
    queryKey: ["management-contracts", { page: 1, page_size: 100 }],
    queryFn: () => managementApi.listContracts({ page: 1, page_size: 100 }),
    enabled: activeTab === "contracts" || Boolean(contractModalContext),
  });

  const { data: managementEntitiesLookup } = useQuery({
    queryKey: ["management-entity-options"],
    queryFn: () => managementApi.listEntities({ page: 1, page_size: 100 }),
    enabled: activeTab === "contracts" || Boolean(contractModalContext),
  });

  const { data: propertyGroupsLookup } = useQuery({
    queryKey: ["property-group-options"],
    queryFn: () => managementApi.listPropertyGroups({ page: 1, page_size: 100 }),
    enabled: activeTab === "contracts" || Boolean(contractModalContext),
  });

  const { data: ownersLookup } = useQuery({
    queryKey: ["owner-statement-owner-options"],
    queryFn: () => managementApi.listOwners({ page: 1, page_size: 100 }),
    enabled: activeTab === "owners" || activeTab === "contracts" || showOwnerStatement || Boolean(contractModalContext),
  });

  const createExpenseMutation = useMutation({
    mutationFn: financeApi.createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });

  const createOwnerStatementMutation = useMutation({
    mutationFn: financeApi.generateOwnerStatement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const createJournalEntryMutation = useMutation({
    mutationFn: financeApi.createJournalEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
    },
  });

  const saveManagementContractMutation = useMutation({
    mutationFn: async ({ contractId, data }: { contractId?: string | null; data: ManagementContractForm }) => {
      const payload = {
        unit_id: data.unit_id,
        owner_id: data.owner_id,
        management_entity_id: data.management_entity_id,
        property_group_id: data.property_group_id || undefined,
        starts_on: data.starts_on,
        ends_on: data.ends_on || undefined,
        admin_fee_percent: data.admin_fee_percent,
        status: data.status as ContractStatus,
        notes: data.notes || undefined,
      };

      if (contractId) {
        return managementApi.updateContract(contractId, payload);
      }

      return managementApi.createContract(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["management-contracts"] });
      qc.invalidateQueries({ queryKey: ["finance-unit-options"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateExpenseForm>({ resolver: zodResolver(createExpenseSchema) });

  const {
    register: registerOwnerStatement,
    handleSubmit: handleOwnerStatementSubmit,
    reset: resetOwnerStatement,
    formState: { errors: ownerStatementErrors, isSubmitting: isOwnerStatementSubmitting },
  } = useForm<OwnerStatementForm>({ resolver: zodResolver(ownerStatementSchema) });

  const {
    register: registerManualJournal,
    handleSubmit: handleManualJournalSubmit,
    reset: resetManualJournal,
    formState: { errors: manualJournalErrors, isSubmitting: isManualJournalSubmitting },
  } = useForm<ManualJournalForm>({
    resolver: zodResolver(manualJournalSchema),
    defaultValues: { entry_date: new Date().toISOString().split("T")[0] },
  });

  const {
    register: registerManagementContract,
    handleSubmit: handleManagementContractSubmit,
    reset: resetManagementContract,
    formState: { errors: managementContractErrors, isSubmitting: isManagementContractSubmitting },
  } = useForm<ManagementContractForm>({
    resolver: zodResolver(managementContractSchema),
    defaultValues: { status: "active", admin_fee_percent: 0 },
  });

  const onExpenseSubmit = async (formData: CreateExpenseForm) => {
    await createExpenseMutation.mutateAsync({
      ...formData,
      unit_id: formData.unit_id || undefined,
    });
    reset();
    setShowAddExpense(false);
  };

  const onOwnerStatementSubmit = async (formData: OwnerStatementForm) => {
    await createOwnerStatementMutation.mutateAsync(formData);
    resetOwnerStatement();
    setShowOwnerStatement(false);
  };

  const onManualJournalSubmit = async (formData: ManualJournalForm) => {
    await createJournalEntryMutation.mutateAsync({
      entry_date: formData.entry_date,
      description: formData.description,
      source: "manual",
      lines: [
        {
          account_id: formData.debit_account_id,
          description: formData.line_description || formData.description,
          debit: formData.amount,
          credit: 0,
          unit_id: formData.unit_id || undefined,
        },
        {
          account_id: formData.credit_account_id,
          description: formData.line_description || formData.description,
          debit: 0,
          credit: formData.amount,
          unit_id: formData.unit_id || undefined,
        },
      ],
    });
    resetManualJournal({ entry_date: new Date().toISOString().split("T")[0] });
    setShowManualJournal(false);
  };

  const onManagementContractSubmit = async (formData: ManagementContractForm) => {
    await saveManagementContractMutation.mutateAsync({
      contractId: contractModalContext?.contractId,
      data: formData,
    });
    resetManagementContract();
    setContractModalContext(null);
  };

  const expenseRows = expenses?.items ?? [];
  const revenueRows = revenue?.items ?? [];
  const invoiceRows = invoices?.items ?? [];
  const ownerStatementRows = ownerStatements?.items ?? [];
  const journalRows = journalEntries?.items ?? [];
  const contractRows = managementContracts?.items ?? [];
  const trialBalanceRows = trialBalance?.items.filter((item) => item.debit !== 0 || item.credit !== 0) ?? [];
  const allTrialBalanceRows = trialBalance?.items ?? [];
  const accountCount = accounts?.length ?? 0;
  const unitsById = useMemo(
    () => new Map((unitsLookup?.items ?? []).map((unit) => [unit.id, `${unit.code} - ${unit.name}`])),
    [unitsLookup]
  );
  const ownersById = useMemo(
    () => new Map((ownersLookup?.items ?? []).map((owner) => [owner.id, owner.name])),
    [ownersLookup]
  );
  const accountsById = useMemo(
    () => new Map((accounts ?? []).map((account) => [account.id, account])),
    [accounts]
  );
  const accountTreeRows = useMemo(() => {
    const byParent = new Map<string | null, Account[]>();
    (accounts ?? []).forEach((account) => {
      const parentKey = account.parent_id ?? null;
      byParent.set(parentKey, [...(byParent.get(parentKey) ?? []), account]);
    });
    byParent.forEach((rows) => rows.sort((left, right) => left.code.localeCompare(right.code)));
    const rows: Array<{ account: Account; depth: number }> = [];
    const visit = (parentId: string | null, depth: number) => {
      (byParent.get(parentId) ?? []).forEach((account) => {
        rows.push({ account, depth });
        visit(account.id, depth + 1);
      });
    };
    visit(null, 0);
    return rows;
  }, [accounts]);
  const managementEntitiesById = useMemo(
    () => new Map((managementEntitiesLookup?.items ?? []).map((entity) => [entity.id, entity.name])),
    [managementEntitiesLookup]
  );
  const propertyGroupsById = useMemo(
    () => new Map((propertyGroupsLookup?.items ?? []).map((group) => [group.id, group.name])),
    [propertyGroupsLookup]
  );
  const latestContractByUnit = useMemo(() => {
    const sorted = [...contractRows].sort((left, right) => new Date(right.starts_on).getTime() - new Date(left.starts_on).getTime());
    const lookup = new Map<string, UnitManagementContract>();
    sorted.forEach((contract) => {
      const current = lookup.get(contract.unit_id);
      if (!current || (contract.status === "active" && current.status !== "active")) {
        lookup.set(contract.unit_id, contract);
      }
    });
    return lookup;
  }, [contractRows]);
  const managedExternalUnits = useMemo(
    () => (unitsLookup?.items ?? []).filter((unit) => unit.is_managed_by_us && Boolean(unit.owner_id)),
    [unitsLookup]
  );
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

  const invoiceStatusLabel = (status: string) => {
    if (status === "paid") return t("مدفوعة", "Paid");
    if (status === "partially_paid") return t("مدفوعة جزئيًا", "Partially paid");
    if (status === "overdue") return t("متأخرة", "Overdue");
    if (status === "cancelled") return t("ملغاة", "Cancelled");
    if (status === "draft") return t("مسودة", "Draft");
    return t("مصدره", "Issued");
  };

  const sourceLabel = (source: string) => {
    if (source === "invoice") return t("فاتورة", "Invoice");
    if (source === "payment") return t("دفعة", "Payment");
    if (source === "revenue") return t("إيراد", "Revenue");
    if (source === "expense") return t("مصروف", "Expense");
    if (source === "owner_statement") return t("كشف مالك", "Owner statement");
    return t("يدوي", "Manual");
  };

  const accountTypeLabel = (type: AccountType) => {
    if (type === "asset") return t("أصول", "Assets");
    if (type === "liability") return t("التزامات", "Liabilities");
    if (type === "equity") return t("حقوق ملكية", "Equity");
    if (type === "revenue") return t("إيرادات", "Revenue");
    return t("مصروفات", "Expenses");
  };

  const accountLabel = (accountId?: string | null) => {
    const account = accountId ? accountsById.get(accountId) : null;
    return account ? `${account.code} - ${account.name}` : t("حساب غير معروف", "Unknown account");
  };

  const unitLabel = (unitId?: string | null, fallback = "—") =>
    unitId ? unitsById.get(unitId) ?? unitId : fallback;

  const ownerLabel = (ownerId?: string | null, fallback = "—") =>
    ownerId ? ownersById.get(ownerId) ?? ownerId : fallback;

  const managementEntityLabel = (entityId?: string | null, fallback = "—") =>
    entityId ? managementEntitiesById.get(entityId) ?? entityId : fallback;

  const propertyGroupLabel = (groupId?: string | null, fallback = "—") =>
    groupId ? propertyGroupsById.get(groupId) ?? groupId : fallback;

  const contractStatusLabel = (status: string) => {
    if (status === "active") return t("نشط", "Active");
    if (status === "paused") return t("موقوف مؤقتًا", "Paused");
    return t("منتهي", "Ended");
  };

  const openManagementContractModal = (unit: UnitSummary, contract?: UnitManagementContract | null) => {
    resetManagementContract({
      unit_id: unit.id,
      owner_id: contract?.owner_id ?? unit.owner_id ?? "",
      management_entity_id: contract?.management_entity_id ?? unit.management_entity_id ?? "",
      property_group_id: contract?.property_group_id ?? unit.property_group_id ?? "",
      starts_on: contract?.starts_on ?? new Date().toISOString().split("T")[0],
      ends_on: contract?.ends_on ?? "",
      admin_fee_percent: Number(contract?.admin_fee_percent ?? unit.admin_fee_percent ?? 0),
      status: contract?.status ?? "active",
      notes: contract?.notes ?? "",
    });
    setContractModalContext({ unitId: unit.id, contractId: contract?.id ?? null });
  };

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
          {(["summary", "revenue", "expenses", "invoices", "accounting", "contracts", "owners"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
            >
              {tab === "summary"
                ? t("الملخص", "Summary")
                : tab === "revenue"
                  ? t("الإيرادات", "Revenue")
                  : tab === "expenses"
                    ? t("المصروفات", "Expenses")
                    : tab === "invoices"
                      ? t("الفواتير", "Invoices")
                      : tab === "accounting"
                        ? t("المحاسبة", "Accounting")
                        : tab === "contracts"
                          ? t("نسب الإدارة", "Management Rates")
                          : t("كشوف الملاك", "Owner Statements")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === "owners" && (
            <button onClick={() => setShowOwnerStatement(true)} className="secondary-action">
              <ReceiptText className="h-4 w-4" />
              {t("كشف مالك", "Owner Statement")}
            </button>
          )}
          {activeTab === "accounting" && (
            <button onClick={() => setShowManualJournal(true)} className="secondary-action">
              <BookOpen className="h-4 w-4" />
              {t("قيد يدوي", "Manual Entry")}
            </button>
          )}
          <button onClick={() => setShowAddExpense(true)} className="primary-action">
            <Plus className="h-4 w-4" />
            {t("مصروف جديد", "New Expense")}
          </button>
        </div>
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
                      <td className="font-medium text-foreground">{unitLabel(record.unit_id)}</td>
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
                      <td className="text-muted-foreground">{unitLabel(record.unit_id, t("عام", "General"))}</td>
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

      {activeTab === "invoices" && (
        loadingInvoices ? (
          <div className="data-table-shell p-6 space-y-3">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : invoiceRows.length === 0 ? (
          <div className="empty-state">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد فواتير عملاء بعد", "No customer invoices yet")}</h2>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {t("ستظهر فواتير الحجز بعد تسجيل خروج الضيف أو توليدها من شاشة الفواتير.", "Booking invoices appear after checkout or manual generation.")}
            </p>
          </div>
        ) : (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("رقم الفاتورة", "Invoice")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("الإجمالي", "Total")}</th>
                    <th>{t("المدفوع", "Paid")}</th>
                    <th>{t("التاريخ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-medium text-foreground">{invoice.invoice_number}</td>
                      <td className="text-muted-foreground">{invoiceStatusLabel(invoice.status)}</td>
                      <td className="text-muted-foreground">{unitLabel(invoice.unit_id)}</td>
                      <td className="font-semibold text-foreground">{formatCurrency(invoice.total_amount, "SAR", locale)}</td>
                      <td className="text-muted-foreground">{formatCurrency(invoice.amount_paid, "SAR", locale)}</td>
                      <td className="text-muted-foreground">{formatDate(invoice.issue_date, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === "accounting" && (
        <div className="space-y-5">
          <div className="accounting-command-panel">
            <div className="min-w-0">
              <p className="section-kicker">{t("مركز المحاسبة", "Accounting Center")}</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground md:text-2xl">{t("ميزان الفترة والقيود اليومية", "Period balance and journal entries")}</h2>
            </div>
            <div className={`accounting-balance-pill ${trialBalance?.is_balanced === false ? "accounting-balance-pill-danger" : "accounting-balance-pill-ok"}`}>
              {trialBalance?.is_balanced === false ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {loadingTrialBalance ? "—" : trialBalance?.is_balanced ? t("متوازن", "Balanced") : t("غير متوازن", "Unbalanced")}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="accounting-metric-card accounting-metric-debit">
              <div className="flex items-start justify-between gap-3">
                <p className="section-kicker">{t("إجمالي المدين", "Total Debit")}</p>
                <span className="accounting-icon-bubble"><TrendingUp className="h-4 w-4" /></span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{loadingTrialBalance ? "—" : formatCurrency(trialBalance?.total_debit ?? 0, "SAR", locale)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("الفترة الحالية", "Current period")}</p>
            </div>
            <div className="accounting-metric-card accounting-metric-credit">
              <div className="flex items-start justify-between gap-3">
                <p className="section-kicker">{t("إجمالي الدائن", "Total Credit")}</p>
                <span className="accounting-icon-bubble"><TrendingDown className="h-4 w-4" /></span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{loadingTrialBalance ? "—" : formatCurrency(trialBalance?.total_credit ?? 0, "SAR", locale)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("الفترة الحالية", "Current period")}</p>
            </div>
            <div className="accounting-metric-card accounting-metric-balance">
              <div className="flex items-start justify-between gap-3">
                <p className="section-kicker">{t("حالة الميزان", "Balance State")}</p>
                <span className="accounting-icon-bubble">{trialBalance?.is_balanced === false ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</span>
              </div>
              <p className={`mt-4 text-2xl font-semibold md:text-3xl ${trialBalance?.is_balanced === false ? "text-rose-600" : "text-foreground"}`}>
                {loadingTrialBalance ? "—" : trialBalance?.is_balanced ? t("متوازن", "Balanced") : t("غير متوازن", "Unbalanced")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(Math.abs((trialBalance?.total_debit ?? 0) - (trialBalance?.total_credit ?? 0)), "SAR", locale)}</p>
            </div>
            <div className="accounting-metric-card accounting-metric-accounts">
              <div className="flex items-start justify-between gap-3">
                <p className="section-kicker">{t("دليل الحسابات", "Chart of Accounts")}</p>
                <span className="accounting-icon-bubble"><Landmark className="h-4 w-4" /></span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{accountCount.toLocaleString(locale)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("حسابات نشطة بالحركة", "Accounts with activity")}: {trialBalanceRows.length.toLocaleString(locale)}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="data-table-shell accounting-panel">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-5">
                <div>
                  <p className="section-kicker">{t("ميزان المراجعة", "Trial Balance")}</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">{t("أرصدة الحسابات خلال الفترة", "Account balances for the period")}</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {trialBalanceRows.length.toLocaleString(locale)} {t("حساب بحركة", "active accounts")}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr>
                      <th>{t("الحساب", "Account")}</th>
                      <th>{t("النوع", "Type")}</th>
                      <th>{t("مدين", "Debit")}</th>
                      <th>{t("دائن", "Credit")}</th>
                      <th>{t("الرصيد", "Balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTrialBalanceRows.map((item) => (
                      <tr key={item.account_id}>
                        <td className="font-medium text-foreground">{item.code} - {item.name}</td>
                        <td className="text-muted-foreground">{accountTypeLabel(item.account_type)}</td>
                        <td className="text-muted-foreground">{formatCurrency(item.debit, "SAR", locale)}</td>
                        <td className="text-muted-foreground">{formatCurrency(item.credit, "SAR", locale)}</td>
                        <td className="font-semibold text-foreground">{formatCurrency(item.balance, "SAR", locale)}</td>
                      </tr>
                    ))}
                    {!loadingTrialBalance && allTrialBalanceRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">{t("لا توجد حسابات بعد", "No accounts yet")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="accounting-panel p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">{t("دليل الحسابات", "Chart of Accounts")}</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">{t("عرض هرمي حسب النوع", "Hierarchical view by type")}</h2>
                </div>
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div className="max-h-[460px] space-y-4 overflow-auto pe-1">
                {ACCOUNT_TYPE_ORDER.map((type) => {
                  const rows = accountTreeRows.filter(({ account }) => account.account_type === type);
                  if (rows.length === 0) return null;
                  return (
                    <div key={type} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">{accountTypeLabel(type)}</p>
                      <div className="space-y-1">
                        {rows.map(({ account, depth }) => (
                          <div key={account.id} className="accounting-tree-row" style={{ paddingInlineStart: `${12 + depth * 18}px` }}>
                            <span className="min-w-0 truncate font-medium text-foreground">{account.code} - {account.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{account.is_active ? t("نشط", "Active") : t("موقوف", "Inactive")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="accounting-panel p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">{t("دفتر اليومية", "Journal")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("القيود وسطور القيد", "Entries and journal lines")}</h2>
              </div>
              <button onClick={() => setShowManualJournal(true)} className="secondary-action">
                <Plus className="h-4 w-4" />
                {t("قيد يدوي", "Manual Entry")}
              </button>
            </div>
            {loadingJournalEntries ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : journalRows.length === 0 ? (
              <div className="empty-state py-10">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("لا توجد قيود بعد", "No journal entries yet")}</h2>
              </div>
            ) : (
              <div className="space-y-3">
                {journalRows.map((entry) => (
                  <div key={entry.id} className="accounting-entry-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{entry.entry_number}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-3 py-1">{sourceLabel(entry.source)}</span>
                        <span className="rounded-full bg-muted px-3 py-1">{formatDate(entry.entry_date, locale)}</span>
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
                      <table className="min-w-[640px] w-full text-sm">
                        <thead>
                          <tr>
                            <th>{t("الحساب", "Account")}</th>
                            <th>{t("الوصف", "Description")}</th>
                            <th>{t("مدين", "Debit")}</th>
                            <th>{t("دائن", "Credit")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id}>
                              <td className="font-medium text-foreground">{accountLabel(line.account_id)}</td>
                              <td className="text-muted-foreground">{line.description ?? "—"}</td>
                              <td className="text-muted-foreground">{formatCurrency(line.debit, "SAR", locale)}</td>
                              <td className="text-muted-foreground">{formatCurrency(line.credit, "SAR", locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "contracts" && (
        loadingManagementContracts ? (
          <div className="data-table-shell p-6 space-y-3">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : managedExternalUnits.length === 0 ? (
          <div className="empty-state">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد وحدات مدارة لملاك خارجيين", "No externally owned managed units")}</h2>
          </div>
        ) : (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("الوحدة", "Unit")}</th>
                    <th>{t("المالك", "Owner")}</th>
                    <th>{t("الإدارة", "Management")}</th>
                    <th>{t("المجموعة", "Group")}</th>
                    <th>{t("النسبة", "Rate")}</th>
                    <th>{t("بداية العقد", "Start")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {managedExternalUnits.map((unit) => {
                    const contract = latestContractByUnit.get(unit.id);
                    const rate = Number(contract?.admin_fee_percent ?? unit.admin_fee_percent ?? 0);
                    return (
                      <tr key={unit.id}>
                        <td className="font-medium text-foreground">{unitLabel(unit.id)}</td>
                        <td className="text-muted-foreground">{ownerLabel(contract?.owner_id ?? unit.owner_id)}</td>
                        <td className="text-muted-foreground">{managementEntityLabel(contract?.management_entity_id ?? unit.management_entity_id)}</td>
                        <td className="text-muted-foreground">{propertyGroupLabel(contract?.property_group_id ?? unit.property_group_id)}</td>
                        <td>
                          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {rate.toLocaleString(locale, { maximumFractionDigits: 2 })}%
                          </span>
                        </td>
                        <td className="text-muted-foreground">{contract?.starts_on ? formatDate(contract.starts_on, locale) : "—"}</td>
                        <td className="text-muted-foreground">{contract ? contractStatusLabel(contract.status) : t("بدون عقد", "No contract")}</td>
                        <td>
                          <button onClick={() => openManagementContractModal(unit, contract)} className="secondary-action px-3 py-2 text-xs text-primary">
                            {t("تعديل النسبة", "Edit Rate")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {contractModalContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("نسبة الإدارة", "Management Rate")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{unitLabel(contractModalContext.unitId)}</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleManagementContractSubmit(onManagementContractSubmit)} className="space-y-4">
              <input type="hidden" {...registerManagementContract("unit_id")} />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المالك *", "Owner *")}</label>
                  <select {...registerManagementContract("owner_id")} className="input-field">
                    <option value="">{t("اختر المالك", "Choose owner")}</option>
                    {ownersLookup?.items.map((owner) => (
                      <option key={owner.id} value={owner.id}>{owner.name}</option>
                    ))}
                  </select>
                  {managementContractErrors.owner_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(managementContractErrors.owner_id.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("جهة الإدارة *", "Management Entity *")}</label>
                  <select {...registerManagementContract("management_entity_id")} className="input-field">
                    <option value="">{t("اختر جهة الإدارة", "Choose management")}</option>
                    {managementEntitiesLookup?.items.map((entity) => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                  {managementContractErrors.management_entity_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(managementContractErrors.management_entity_id.message, language)}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("النسبة % *", "Rate % *")}</label>
                  <input {...registerManagementContract("admin_fee_percent", { valueAsNumber: true })} type="number" min="0" max="100" step="0.01" className="input-field" />
                  {managementContractErrors.admin_fee_percent && <p className="mt-1 text-xs text-red-500">{translateFormMessage(managementContractErrors.admin_fee_percent.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("بداية العقد *", "Start *")}</label>
                  <input {...registerManagementContract("starts_on")} type="date" className="input-field" />
                  {managementContractErrors.starts_on && <p className="mt-1 text-xs text-red-500">{translateFormMessage(managementContractErrors.starts_on.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("نهاية العقد", "End")}</label>
                  <input {...registerManagementContract("ends_on")} type="date" className="input-field" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المجموعة", "Group")}</label>
                  <select {...registerManagementContract("property_group_id")} className="input-field">
                    <option value="">{t("بدون مجموعة", "No group")}</option>
                    {propertyGroupsLookup?.items.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الحالة", "Status")}</label>
                  <select {...registerManagementContract("status")} className="input-field">
                    <option value="active">{t("نشط", "Active")}</option>
                    <option value="paused">{t("موقوف مؤقتًا", "Paused")}</option>
                    <option value="ended">{t("منتهي", "Ended")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("ملاحظات", "Notes")}</label>
                <textarea {...registerManagementContract("notes")} rows={3} className="input-field resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetManagementContract();
                    setContractModalContext(null);
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isManagementContractSubmitting} className="primary-action disabled:opacity-50">
                  {isManagementContractSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ النسبة", "Save Rate")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "owners" && (
        loadingOwnerStatements ? (
          <div className="data-table-shell p-6 space-y-3">
            {[...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : ownerStatementRows.length === 0 ? (
          <div className="empty-state">
            <ReceiptText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد كشوف ملاك بعد", "No owner statements yet")}</h2>
          </div>
        ) : (
          <div className="data-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{t("الكشف", "Statement")}</th>
                    <th>{t("المالك", "Owner")}</th>
                    <th>{t("الفترة", "Period")}</th>
                    <th>{t("الصافي", "Net")}</th>
                    <th>{t("الحالة", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerStatementRows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-medium text-foreground">{invoice.invoice_number}</td>
                      <td className="text-muted-foreground">{ownerLabel(invoice.owner_id)}</td>
                      <td className="text-muted-foreground">
                        {invoice.period_start && invoice.period_end ? `${formatDate(invoice.period_start, locale)} - ${formatDate(invoice.period_end, locale)}` : "—"}
                      </td>
                      <td className="font-semibold text-foreground">{formatCurrency(invoice.total_amount, "SAR", locale)}</td>
                      <td className="text-muted-foreground">{invoiceStatusLabel(invoice.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {showManualJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("قيد يدوي", "Manual Journal")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إضافة قيد متوازن", "Add a balanced entry")}</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleManualJournalSubmit(onManualJournalSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("تاريخ القيد *", "Entry Date *")}</label>
                  <input {...registerManualJournal("entry_date")} type="date" className="input-field" />
                  {manualJournalErrors.entry_date && <p className="mt-1 text-xs text-red-500">{translateFormMessage(manualJournalErrors.entry_date.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المبلغ *", "Amount *")}</label>
                  <input {...registerManualJournal("amount", { valueAsNumber: true })} type="number" min="0" step="0.01" className="input-field" />
                  {manualJournalErrors.amount && <p className="mt-1 text-xs text-red-500">{translateFormMessage(manualJournalErrors.amount.message, language)}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("وصف القيد *", "Entry Description *")}</label>
                <input {...registerManualJournal("description")} className="input-field" />
                {manualJournalErrors.description && <p className="mt-1 text-xs text-red-500">{translateFormMessage(manualJournalErrors.description.message, language)}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("حساب المدين *", "Debit Account *")}</label>
                  <select {...registerManualJournal("debit_account_id")} className="input-field">
                    <option value="">{t("اختر الحساب", "Choose account")}</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                    ))}
                  </select>
                  {manualJournalErrors.debit_account_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(manualJournalErrors.debit_account_id.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("حساب الدائن *", "Credit Account *")}</label>
                  <select {...registerManualJournal("credit_account_id")} className="input-field">
                    <option value="">{t("اختر الحساب", "Choose account")}</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                    ))}
                  </select>
                  {manualJournalErrors.credit_account_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(manualJournalErrors.credit_account_id.message, language)}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الوحدة", "Unit")}</label>
                  <select {...registerManualJournal("unit_id")} className="input-field">
                    <option value="">{t("بدون وحدة", "No unit")}</option>
                    {unitsLookup?.items.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("وصف السطور", "Line Description")}</label>
                  <input {...registerManualJournal("line_description")} className="input-field" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualJournal(false);
                    resetManualJournal({ entry_date: new Date().toISOString().split("T")[0] });
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isManualJournalSubmitting} className="primary-action disabled:opacity-50">
                  {isManualJournalSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ القيد", "Save Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOwnerStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("كشف مالك", "Owner Statement")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("توليد كشف مالك", "Generate Owner Statement")}</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleOwnerStatementSubmit(onOwnerStatementSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("المالك *", "Owner *")}</label>
                <select {...registerOwnerStatement("owner_id")} className="input-field">
                  <option value="">{t("اختر المالك", "Choose owner")}</option>
                  {ownersLookup?.items.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
                {ownerStatementErrors.owner_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(ownerStatementErrors.owner_id.message, language)}</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("من تاريخ *", "From *")}</label>
                  <input {...registerOwnerStatement("period_start")} type="date" className="input-field" />
                  {ownerStatementErrors.period_start && <p className="mt-1 text-xs text-red-500">{translateFormMessage(ownerStatementErrors.period_start.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("إلى تاريخ *", "To *")}</label>
                  <input {...registerOwnerStatement("period_end")} type="date" className="input-field" />
                  {ownerStatementErrors.period_end && <p className="mt-1 text-xs text-red-500">{translateFormMessage(ownerStatementErrors.period_end.message, language)}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerStatement(false);
                    resetOwnerStatement();
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isOwnerStatementSubmitting} className="primary-action disabled:opacity-50">
                  {isOwnerStatementSubmitting ? t("جاري التوليد...", "Generating...") : t("توليد", "Generate")}
                </button>
              </div>
            </form>
          </div>
        </div>
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
