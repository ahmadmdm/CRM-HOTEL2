"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useUnits, useCreateUnit, useChangeUnitStatus, unitKeys } from "@/hooks/useUnits";
import { UnitStatusBadge } from "./UnitStatusBadge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { formatCurrency } from "@/lib/utils";
import {
  getRoleLabel,
  getUnitStatusLabel,
  pick,
  translateFormMessage,
  useI18n,
} from "@/lib/i18n";
import { unitsApi } from "@/lib/api/units";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/stores/authStore";
import type { Unit, UnitStatus, UnitSummary, UserReference } from "@/types";
import {
  ArrowUpRight,
  Bath,
  Bed,
  Building2,
  Maximize,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createUnitSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  name: z.string().min(1, "الاسم مطلوب"),
  floor: z.number().int().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  area_sqm: z.number().optional(),
  base_price_per_night: z.number().min(0, "السعر مطلوب"),
  description: z.string().optional(),
});

type CreateUnitForm = z.infer<typeof createUnitSchema>;

type AssignmentDraft = {
  supervisor_id: string;
  housekeeping_team_ids: string[];
  maintenance_team_ids: string[];
};

type AssignmentPayload = Partial<Unit>;
type BulkAssignmentMode = "replace" | "clear";
type BulkDialogState =
  | null
  | {
      kind: "notice" | "clear" | "overwrite";
      title: string;
      description: string;
      confirmLabel: string;
      tone: "primary" | "danger";
    };

const STATUS_FILTER_VALUES: Array<UnitStatus | ""> = [
  "",
  "vacant",
  "ready",
  "reserved",
  "occupied",
  "waiting_cleaning",
  "maintenance",
];

const STATUS_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  vacant: ["reserved", "maintenance"],
  ready: ["reserved", "maintenance"],
  reserved: ["occupied", "vacant"],
  occupied: ["waiting_cleaning", "maintenance"],
  waiting_cleaning: ["ready", "maintenance"],
  maintenance: ["ready", "vacant"],
};

function getTransitionLabel(currentStatus: UnitStatus, nextStatus: UnitStatus, language: "ar" | "en") {
  const key = `${currentStatus}:${nextStatus}`;

  switch (key) {
    case "vacant:reserved":
    case "ready:reserved":
      return pick(language, "حجز", "Reserve");
    case "vacant:maintenance":
    case "ready:maintenance":
    case "occupied:maintenance":
    case "waiting_cleaning:maintenance":
      return pick(language, "صيانة", "Send to Maintenance");
    case "reserved:occupied":
      return pick(language, "إشغال", "Occupy");
    case "reserved:vacant":
      return pick(language, "إتاحة", "Release");
    case "occupied:waiting_cleaning":
      return pick(language, "تنظيف", "Send to Cleaning");
    case "waiting_cleaning:ready":
    case "maintenance:ready":
      return pick(language, "جاهزة", "Mark Ready");
    case "maintenance:vacant":
      return pick(language, "شاغرة", "Mark Vacant");
    default:
      return getUnitStatusLabel(nextStatus, language);
  }
}

function toAssignmentDraft(unit: UnitSummary): AssignmentDraft {
  return {
    supervisor_id: unit.supervisor?.id ?? "",
    housekeeping_team_ids: unit.housekeeping_team?.map((member) => member.id) ?? [],
    maintenance_team_ids: unit.maintenance_team?.map((member) => member.id) ?? [],
  };
}

function buildAssignmentPayload(draft: AssignmentDraft): AssignmentPayload {
  return {
    supervisor_id: draft.supervisor_id || null,
    housekeeping_team_ids: draft.housekeeping_team_ids,
    maintenance_team_ids: draft.maintenance_team_ids,
  };
}

function isFullyStaffed(unit: UnitSummary) {
  return Boolean(unit.supervisor && unit.housekeeping_team?.length && unit.maintenance_team?.length);
}

function TeamChips({ members, emptyLabel }: { members?: UserReference[]; emptyLabel: string }) {
  if (!members?.length) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {members.slice(0, 2).map((member) => (
        <span
          key={member.id}
          className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-white/70 dark:bg-white/10 dark:ring-white/10"
        >
          {member.full_name}
        </span>
      ))}
      {members.length > 2 && (
        <span className="rounded-full bg-slate-950/10 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/10">
          +{members.length - 2}
        </span>
      )}
    </div>
  );
}

export function UnitsPageContent() {
  const { language, locale, t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UnitStatus | "">("");
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [assignmentModalUnit, setAssignmentModalUnit] = useState<UnitSummary | null>(null);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkAssignmentMode>("replace");
  const [bulkDialogState, setBulkDialogState] = useState<BulkDialogState>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({
    supervisor_id: "",
    housekeeping_team_ids: [],
    maintenance_team_ids: [],
  });
  const [bulkAssignmentDraft, setBulkAssignmentDraft] = useState<AssignmentDraft>({
    supervisor_id: "",
    housekeeping_team_ids: [],
    maintenance_team_ids: [],
  });
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const canManageAssignments = userRole === "super_admin" || userRole === "sub_admin";

  const { data, isLoading } = useUnits({
    page,
    page_size: 12,
    status: statusFilter || undefined,
  });

  const { data: assignmentCandidates = [] } = useQuery({
    queryKey: ["assignment-candidates"],
    queryFn: usersApi.listAssignmentCandidates,
    enabled: canManageAssignments,
  });

  const createUnit = useCreateUnit();
  const changeStatus = useChangeUnitStatus();
  const queryClient = useQueryClient();
  const updateAssignments = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignmentPayload }) => unitsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
  const bulkUpdateAssignments = useMutation({
    mutationFn: async ({ unitIds, payload }: { unitIds: string[]; payload: AssignmentPayload }) =>
      Promise.all(unitIds.map((unitId) => unitsApi.update(unitId, payload))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUnitForm>({ resolver: zodResolver(createUnitSchema) });

  const onCreateSubmit = async (formData: CreateUnitForm) => {
    await createUnit.mutateAsync({
      code: formData.code,
      name: formData.name,
      floor: formData.floor,
      area_sqm: formData.area_sqm,
      description: formData.description,
      price_per_night: formData.base_price_per_night,
    });
    reset();
    setShowCreate(false);
  };

  const openAssignmentModal = (unit: UnitSummary) => {
    setAssignmentModalUnit(unit);
    setAssignmentDraft(toAssignmentDraft(unit));
  };

  const closeAssignmentModal = () => {
    setAssignmentModalUnit(null);
    setAssignmentDraft({ supervisor_id: "", housekeeping_team_ids: [], maintenance_team_ids: [] });
  };

  const handleMultiSelectChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    field: "housekeeping_team_ids" | "maintenance_team_ids",
    isBulk = false
  ) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    if (isBulk) {
      setBulkAssignmentDraft((current) => ({ ...current, [field]: values }));
      return;
    }

    setAssignmentDraft((current) => ({ ...current, [field]: values }));
  };

  const handleSaveAssignments = async () => {
    if (!assignmentModalUnit) {
      return;
    }

    await updateAssignments.mutateAsync({
      id: assignmentModalUnit.id,
      payload: buildAssignmentPayload(assignmentDraft),
    });
    closeAssignmentModal();
  };

  const normalizedSearch = search.trim().toLowerCase();
  const units = data?.items ?? [];
  const unitsLoaded = !isLoading && Boolean(data);
  const searchableUnits = units.filter(
    (unit) =>
      !normalizedSearch ||
      unit.code.toLowerCase().includes(normalizedSearch) ||
      unit.name.toLowerCase().includes(normalizedSearch)
  );
  const filtered = searchableUnits.filter((unit) => !showOnlyIncomplete || !isFullyStaffed(unit));
  const statusOptions = STATUS_FILTER_VALUES.map((value) => ({
    value,
    label: value ? getUnitStatusLabel(value, language) : t("كل الحالات", "All Statuses"),
  }));

  const openBulkAssignmentModal = () => {
    const defaultSelection = searchableUnits.filter((unit) => !isFullyStaffed(unit)).map((unit) => unit.id);
    setSelectedUnitIds(defaultSelection.length ? defaultSelection : filtered.map((unit) => unit.id));
    setBulkAssignmentDraft({ supervisor_id: "", housekeeping_team_ids: [], maintenance_team_ids: [] });
    setBulkMode("replace");
    setShowBulkAssignment(true);
  };

  const closeBulkAssignmentModal = () => {
    setShowBulkAssignment(false);
    setSelectedUnitIds([]);
    setBulkAssignmentDraft({ supervisor_id: "", housekeeping_team_ids: [], maintenance_team_ids: [] });
    setBulkMode("replace");
    setBulkDialogState(null);
  };

  const handleBulkUnitToggle = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId) ? current.filter((value) => value !== unitId) : [...current, unitId]
    );
  };

  const executeBulkAssignments = async () => {
    await bulkUpdateAssignments.mutateAsync({
      unitIds: selectedUnitIds,
      payload:
        bulkMode === "clear"
          ? { supervisor_id: null, housekeeping_team_ids: [], maintenance_team_ids: [] }
          : buildAssignmentPayload(bulkAssignmentDraft),
    });
    closeBulkAssignmentModal();
  };

  const handleBulkDialogConfirm = async () => {
    if (!bulkDialogState) {
      return;
    }

    if (bulkDialogState.kind === "notice") {
      setBulkDialogState(null);
      return;
    }

    await executeBulkAssignments();
  };

  const handleBulkSaveAssignments = async () => {
    if (!selectedUnitIds.length) {
      return;
    }

    const selectedUnits = units.filter((unit) => selectedUnitIds.includes(unit.id));
    const selectedCompletedCount = selectedUnits.filter((unit) => isFullyStaffed(unit)).length;

    if (bulkMode === "replace") {
      const hasReplacementValues = Boolean(
        bulkAssignmentDraft.supervisor_id ||
          bulkAssignmentDraft.housekeeping_team_ids.length ||
          bulkAssignmentDraft.maintenance_team_ids.length
      );

      if (!hasReplacementValues) {
        setBulkDialogState({
          kind: "notice",
          title: t("أكمل بيانات العملية أولاً", "Complete the action details first"),
          description: t(
            "حدد مشرفًا أو فريقًا واحدًا على الأقل، أو انتقل إلى وضع تفريغ التغطية إذا كان الهدف إزالة التعيينات الحالية.",
            "Choose at least one supervisor or team, or switch to clear coverage mode if you need to remove the current assignments."
          ),
          confirmLabel: t("فهمت", "Got it"),
          tone: "primary",
        });
        return;
      }
    }

    if (bulkMode === "clear") {
      setBulkDialogState({
        kind: "clear",
        title: t("تأكيد تفريغ التغطية", "Confirm clearing coverage"),
        description: t(
          "سيتم حذف المشرف وفريقي التنظيف والصيانة من {count} وحدات محددة. لن يؤثر ذلك على بيانات الوحدة نفسها، لكنه سيزيل التغطية التشغيلية الحالية.",
          "The supervisor, housekeeping team, and maintenance team will be removed from {count} selected units. This will not change unit data, but it will remove the current operational coverage.",
          { count: selectedUnitIds.length }
        ),
        confirmLabel: t("نعم، فرّغ التغطية", "Yes, clear coverage"),
        tone: "danger",
      });
      return;
    }

    if (bulkMode === "replace" && selectedCompletedCount > 0) {
      setBulkDialogState({
        kind: "overwrite",
        title: t("تأكيد استبدال التغطية", "Confirm replacing coverage"),
        description: t(
          "هناك {count} وحدات مكتملة ضمن التحديد الحالي. متابعة التنفيذ ستستبدل التغطية التشغيلية الموجودة لهذه الوحدات بالقيم الجديدة.",
          "There are {count} fully covered units in the current selection. Continuing will replace the existing operational coverage for those units with the new values.",
          { count: selectedCompletedCount }
        ),
        confirmLabel: t("نعم، استبدل التغطية", "Yes, replace coverage"),
        tone: "danger",
      });
      return;
    }

    await executeBulkAssignments();
  };

  const readyCount = units.filter((unit) => unit.status === "ready").length;
  const fullyStaffedCount = units.filter((unit) => isFullyStaffed(unit)).length;
  const incompleteVisibleCount = searchableUnits.filter((unit) => !isFullyStaffed(unit)).length;

  const supervisorCandidates = assignmentCandidates.filter((candidate) =>
    ["super_admin", "sub_admin", "operations"].includes(candidate.role)
  );
  const housekeepingCandidates = assignmentCandidates.filter((candidate) => candidate.role === "housekeeping");
  const maintenanceCandidates = assignmentCandidates.filter((candidate) => candidate.role === "maintenance");

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة الوحدات", "Units Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t("إدارة الوحدات وتغطيتها التشغيلية من شاشة واحدة.", "Manage units and operational coverage from one screen.")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "راقب حالة كل وحدة، وعيّن المشرف وفِرق التنظيف والصيانة، واعزل الوحدات غير المكتملة بسرعة عند الحاجة.",
                  "Monitor each unit, assign supervisors and housekeeping and maintenance teams, and isolate incomplete units quickly when needed."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="hero-metric">
              <p className="section-kicker">{t("إجمالي الوحدات", "Total Units")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{unitsLoaded ? data?.total ?? 0 : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي الوحدات المسجلة", "All recorded units")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("الجاهزة الآن", "Ready Now")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{unitsLoaded ? readyCount : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("جاهزة للدخول أو الحجز", "Ready for check-in or booking")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("مكتملة التغطية", "Fully Covered")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{unitsLoaded ? fullyStaffedCount : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("وحدات مكتملة التغطية التشغيلية", "Units with complete operational coverage")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="toolbar-shell">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="toolbar-search lg:max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("ابحث بالكود أو اسم الوحدة...", "Search by unit code or name...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-1 flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value as UnitStatus | "")}
                className={statusFilter === option.value ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => setShowOnlyIncomplete((current) => !current)}
              className={showOnlyIncomplete ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
            >
              {t("غير مكتملة", "Incomplete")} {unitsLoaded ? `(${incompleteVisibleCount})` : ""}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="text-sm text-muted-foreground">
            {unitsLoaded ? (
              <>
                <span className="font-semibold text-foreground">{filtered.length}</span> {t("من", "of")} <span className="font-semibold text-foreground">{data?.total ?? 0}</span> {t("وحدة", "units")}
              </>
            ) : (
              <span>{t("جاري تحميل الوحدات...", "Loading units...")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManageAssignments && unitsLoaded && filtered.length > 0 && (
              <button onClick={openBulkAssignmentModal} className="secondary-action text-primary">
                <Users className="h-4 w-4" />
                {t("تعيين جماعي", "Bulk Assignment")}
              </button>
            )}
            <button onClick={() => setShowCreate(true)} className="primary-action">
              <Plus className="h-4 w-4" />
              {t("إضافة وحدة", "Add Unit")}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="surface-card h-[360px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("لا توجد وحدات مطابقة للبحث الحالي", "No units match the current search")}</h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {t(
              "غيّر كلمات البحث أو حالة التصفية، أو ألغِ فلتر غير المكتملة، أو أضف وحدة جديدة.",
              "Change the search terms or status filter, clear the incomplete filter, or add a new unit."
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              canManageAssignments={canManageAssignments}
              onChangeStatus={changeStatus.mutate}
              onManageAssignments={openAssignmentModal}
            />
          ))}
        </div>
      )}

      {data && data.total > 12 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="secondary-action"
          >
            {t("السابق", "Previous")}
          </button>
          <span className="secondary-action border-transparent bg-transparent shadow-none">
            {page} / {Math.ceil(data.total / 12)}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= Math.ceil(data.total / 12)}
            className="secondary-action"
          >
            {t("التالي", "Next")}
          </button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("إضافة وحدة", "Add Unit")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إضافة وحدة جديدة", "Add a New Unit")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "أدخل بيانات الوحدة الأساسية لتظهر مباشرة في مخزون التشغيل، ثم اربطها بفريقها من نفس الصفحة بعد الإنشاء.",
                    "Enter the unit basics so it appears immediately in operations inventory, then link its team from the same page after creation."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("كود الوحدة *", "Unit Code *")}</label>
                  <input {...register("code")} className="input-field" placeholder="A101" />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.code.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("اسم الوحدة *", "Unit Name *")}</label>
                  <input {...register("name")} className="input-field" placeholder={t("شقة A101", "Apartment A101")} />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.name.message, language)}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("غرف النوم", "Bedrooms")}</label>
                  <input {...register("bedrooms", { valueAsNumber: true })} type="number" min="0" className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الحمامات", "Bathrooms")}</label>
                  <input {...register("bathrooms", { valueAsNumber: true })} type="number" min="0" className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المساحة م²", "Area m²")}</label>
                  <input {...register("area_sqm", { valueAsNumber: true })} type="number" min="0" className="input-field" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("السعر الليلي (ريال) *", "Nightly Price (SAR) *")}</label>
                <input
                  {...register("base_price_per_night", { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="input-field"
                />
                {errors.base_price_per_night && (
                  <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.base_price_per_night.message, language)}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    reset();
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isSubmitting} className="primary-action disabled:opacity-50">
                  {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ الوحدة", "Save Unit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignmentModalUnit && canManageAssignments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-4xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("تغطية الفريق", "Team Coverage")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("تغطية الوحدة {code}", "Coverage for Unit {code}", { code: assignmentModalUnit.code })}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "عيّن مشرفًا واحدًا، ثم اربط فريق التنظيف وفريق الصيانة. يمكن مشاركة نفس العضو بين أكثر من وحدة دون قيود إضافية.",
                    "Assign one supervisor, then link housekeeping and maintenance teams. The same member can be shared across multiple units without extra restrictions."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("المشرف", "Supervisor")}</label>
                <select
                  aria-label={t("المشرف", "Supervisor")}
                  value={assignmentDraft.supervisor_id}
                  onChange={(event) =>
                    setAssignmentDraft((current) => ({ ...current, supervisor_id: event.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">{t("بدون مشرف محدد", "No specific supervisor")}</option>
                  {supervisorCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name} - {getRoleLabel(candidate.role, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("فريق التنظيف", "Housekeeping Team")}</label>
                <select
                  aria-label={t("فريق التنظيف", "Housekeeping Team")}
                  multiple
                  size={7}
                  value={assignmentDraft.housekeeping_team_ids}
                  onChange={(event) => handleMultiSelectChange(event, "housekeeping_team_ids")}
                  className="input-field min-h-[180px]"
                >
                  {housekeepingCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("فريق الصيانة", "Maintenance Team")}</label>
                <select
                  aria-label={t("فريق الصيانة", "Maintenance Team")}
                  multiple
                  size={7}
                  value={assignmentDraft.maintenance_team_ids}
                  onChange={(event) => handleMultiSelectChange(event, "maintenance_team_ids")}
                  className="input-field min-h-[180px]"
                >
                  {maintenanceCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              {t(
                "ملاحظة: استخدم Ctrl أو Command لاختيار أكثر من عضو في الفريق. نفس المستخدم يمكن أن يكون جزءًا من أكثر من وحدة حسب حاجة التشغيل.",
                "Note: use Ctrl or Command to select more than one team member. The same user can belong to more than one unit as operations require."
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeAssignmentModal} className="secondary-action">
                {t("إلغاء", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveAssignments();
                }}
                disabled={updateAssignments.isPending}
                className="primary-action disabled:opacity-50"
              >
                {updateAssignments.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ التغطية", "Save Coverage")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkAssignment && canManageAssignments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-5xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{t("التعيين الجماعي", "Bulk Assignment")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("تعيين جماعي للوحدات المحددة", "Bulk Assignment for Selected Units")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "اختر استبدال التغطية الحالية أو تفريغها بالكامل. التحديد الافتراضي يبدأ بالوحدات غير المكتملة فقط.",
                    "Choose whether to replace the current coverage or clear it completely. The default selection starts with incomplete units only."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-white/55 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t("الوحدات المستهدفة", "Target Units")}</h3>
                    <p className="text-xs text-muted-foreground">{t("{selected} وحدة محددة من {total}", "{selected} units selected out of {total}", { selected: selectedUnitIds.length, total: filtered.length })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUnitIds(filtered.filter((unit) => !isFullyStaffed(unit)).map((unit) => unit.id))}
                      className="secondary-action px-3 py-2 text-xs"
                    >
                      {t("غير المكتملة فقط", "Incomplete Only")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUnitIds(filtered.map((unit) => unit.id))}
                      className="secondary-action px-3 py-2 text-xs"
                    >
                      {t("تحديد الكل", "Select All")}
                    </button>
                  </div>
                </div>

                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {filtered.map((unit) => {
                    const checked = selectedUnitIds.includes(unit.id);
                    return (
                      <label
                        key={unit.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                          checked
                            ? "border-primary/40 bg-primary/5"
                            : "border-slate-200/70 bg-transparent dark:border-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleBulkUnitToggle(unit.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{unit.code}</p>
                              <p className="text-xs text-muted-foreground">{unit.name}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                isFullyStaffed(unit)
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                              }`}
                            >
                              {isFullyStaffed(unit) ? t("مكتملة", "Complete") : t("ناقصة", "Incomplete")}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {t("المشرف: {name}", "Supervisor: {name}", { name: unit.supervisor?.full_name ?? t("غير معين", "Unassigned") })}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 rounded-[24px] border border-white/55 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">{t("نوع العملية", "Action Type")}</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkMode("replace")}
                      className={bulkMode === "replace" ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
                    >
                      {t("استبدال التغطية", "Replace Coverage")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMode("clear")}
                      className={bulkMode === "clear" ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
                    >
                      {t("تفريغ التغطية", "Clear Coverage")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("المشرف", "Supervisor")}</label>
                  <select
                    aria-label={t("المشرف الجماعي", "Bulk Supervisor")}
                    value={bulkAssignmentDraft.supervisor_id}
                    onChange={(event) =>
                      setBulkAssignmentDraft((current) => ({ ...current, supervisor_id: event.target.value }))
                    }
                    className="input-field"
                    disabled={bulkMode === "clear"}
                  >
                    <option value="">{t("بدون مشرف محدد", "No specific supervisor")}</option>
                    {supervisorCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name} - {getRoleLabel(candidate.role, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("فريق التنظيف", "Housekeeping Team")}</label>
                  <select
                    aria-label={t("فريق التنظيف الجماعي", "Bulk Housekeeping Team")}
                    multiple
                    size={6}
                    value={bulkAssignmentDraft.housekeeping_team_ids}
                    onChange={(event) => handleMultiSelectChange(event, "housekeeping_team_ids", true)}
                    className="input-field min-h-[160px]"
                    disabled={bulkMode === "clear"}
                  >
                    {housekeepingCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("فريق الصيانة", "Maintenance Team")}</label>
                  <select
                    aria-label={t("فريق الصيانة الجماعي", "Bulk Maintenance Team")}
                    multiple
                    size={6}
                    value={bulkAssignmentDraft.maintenance_team_ids}
                    onChange={(event) => handleMultiSelectChange(event, "maintenance_team_ids", true)}
                    className="input-field min-h-[160px]"
                    disabled={bulkMode === "clear"}
                  >
                    {maintenanceCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              {bulkMode === "clear"
                ? t(
                    "سيتم حذف المشرف وفريقي التنظيف والصيانة من جميع الوحدات المحددة.",
                    "The supervisor, housekeeping team, and maintenance team will be removed from all selected units."
                  )
                : t(
                    "سيُطبّق نفس المشرف والفِرق على الوحدات المحددة. إذا اخترت وحدات مكتملة فسيظهر تأكيد قبل الكتابة عليها.",
                    "The same supervisor and teams will be applied to the selected units. If you choose fully covered units, a confirmation will appear before overwriting them."
                  )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeBulkAssignmentModal} className="secondary-action">
                {t("إلغاء", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleBulkSaveAssignments();
                }}
                disabled={
                  bulkUpdateAssignments.isPending ||
                  selectedUnitIds.length === 0 ||
                  (bulkMode === "replace" &&
                    !bulkAssignmentDraft.supervisor_id &&
                    bulkAssignmentDraft.housekeeping_team_ids.length === 0 &&
                    bulkAssignmentDraft.maintenance_team_ids.length === 0)
                }
                className="primary-action disabled:opacity-50"
              >
                {bulkUpdateAssignments.isPending
                  ? t("جاري التطبيق...", "Applying...")
                  : bulkMode === "clear"
                    ? t("تفريغ التغطية", "Clear Coverage")
                    : t("تطبيق التغطية", "Apply Coverage")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(bulkDialogState)}
        title={bulkDialogState?.title ?? ""}
        description={bulkDialogState?.description ?? ""}
        confirmLabel={bulkDialogState?.confirmLabel ?? ""}
        cancelLabel={t("إلغاء", "Cancel")}
        onClose={() => setBulkDialogState(null)}
        onConfirm={() => {
          void handleBulkDialogConfirm();
        }}
        isProcessing={bulkUpdateAssignments.isPending}
        tone={bulkDialogState?.tone ?? "primary"}
        showCancel={bulkDialogState?.kind !== "notice"}
      />
    </div>
  );
}

function UnitCard({
  unit,
  canManageAssignments,
  onChangeStatus,
  onManageAssignments,
}: {
  unit: UnitSummary;
  canManageAssignments: boolean;
  onChangeStatus: (args: { id: string; status: UnitStatus }) => void;
  onManageAssignments: (unit: UnitSummary) => void;
}) {
  const { language, locale, t } = useI18n();
  const actions = STATUS_TRANSITIONS[unit.status] ?? [];

  return (
    <div className="surface-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 opacity-95" />
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-slate-950/10 ring-1 ring-white/10 backdrop-blur-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <UnitStatusBadge status={unit.status} />
      </div>

      <div className="relative mt-8 rounded-[24px] bg-white/72 p-4 shadow-sm ring-1 ring-white/50 backdrop-blur-sm dark:bg-slate-950/40 dark:ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">{unit.code}</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{unit.name}</h3>
          </div>
          <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {formatCurrency(unit.base_price_per_night ?? unit.price_per_night ?? 0, "SAR", locale)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {unit.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" /> {t("{count} غرف", "{count} bedrooms", { count: unit.bedrooms })}
            </span>
          )}
          {unit.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" /> {t("{count} حمامات", "{count} bathrooms", { count: unit.bathrooms })}
            </span>
          )}
          {unit.area_sqm != null && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3 w-3" /> {t("{count} م²", "{count} m²", { count: unit.area_sqm })}
            </span>
          )}
          {unit.status === "ready" && (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> {t("جاهزة للتشغيل", "Ready for Operations")}
            </span>
          )}
          {unit.status === "maintenance" && (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <Wrench className="h-3 w-3" /> {t("تتطلب متابعة", "Needs Follow-up")}
            </span>
          )}
        </div>

        <div className="mt-5 rounded-[22px] border border-white/55 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("المشرف", "Supervisor")}</span>
            <span className="font-medium text-foreground">{unit.supervisor?.full_name ?? t("غير معين", "Unassigned")}</span>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{t("فريق التنظيف", "Housekeeping Team")}</p>
            <TeamChips members={unit.housekeeping_team} emptyLabel={t("بدون فريق تنظيف", "No housekeeping team")} />
          </div>
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{t("فريق الصيانة", "Maintenance Team")}</p>
            <TeamChips members={unit.maintenance_team} emptyLabel={t("بدون فريق صيانة", "No maintenance team")} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action}
              onClick={() => onChangeStatus({ id: unit.id, status: action })}
              className="secondary-action px-3 py-2 text-xs"
            >
              {getTransitionLabel(unit.status, action, language)}
            </button>
          ))}
          {canManageAssignments && (
            <button onClick={() => onManageAssignments(unit)} className="secondary-action px-3 py-2 text-xs text-primary">
              {t("إدارة الفريق", "Manage Team")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}