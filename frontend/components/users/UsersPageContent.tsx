"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type CreateUserPayload } from "@/lib/api/users";
import { unitsApi } from "@/lib/api/units";
import type { UnitSummary, User, UserRole } from "@/types";
import { formatDate } from "@/lib/utils";
import { getRoleLabel, translateFormMessage, useI18n } from "@/lib/i18n";
import {
  Building2,
  Brush,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  full_name: z.string().min(1, "الاسم مطلوب"),
  role: z.enum(["super_admin", "sub_admin", "financial", "operations", "maintenance", "housekeeping"]),
  phone: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const USER_ROLES: UserRole[] = ["super_admin", "sub_admin", "financial", "operations", "maintenance", "housekeeping"];

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  sub_admin: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  financial: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  operations: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  maintenance: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  housekeeping: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

function collectAssignedUnitCodes(user: User) {
  const allUnits = [
    ...(user.supervised_units ?? []),
    ...(user.housekeeping_units ?? []),
    ...(user.maintenance_units ?? []),
  ];

  return Array.from(new Map(allUnits.map((unit) => [unit.id, unit.code])).values());
}

function TeamSummaryCell({ user }: { user: User }) {
  const { t } = useI18n();
  const codes = collectAssignedUnitCodes(user);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-slate-950/5 px-2.5 py-1 text-[11px] font-medium text-foreground dark:bg-white/10">
          {t("إشراف {count}", "Supervision {count}", { count: user.supervised_units?.length ?? 0 })}
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          {t("تنظيف {count}", "Housekeeping {count}", { count: user.housekeeping_units?.length ?? 0 })}
        </span>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          {t("صيانة {count}", "Maintenance {count}", { count: user.maintenance_units?.length ?? 0 })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {codes.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t("بدون وحدات مرتبطة", "No linked units")}</span>
        ) : (
          <>
            {codes.slice(0, 4).map((code) => (
              <span
                key={code}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
              >
                {code}
              </span>
            ))}
            {codes.length > 4 && (
              <span className="rounded-full bg-slate-950/10 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/10">
                +{codes.length - 4}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UnitCoverageTable({ units }: { units: UnitSummary[] }) {
  const { t } = useI18n();

  if (units.length === 0) {
    return (
      <div className="empty-state">
        <Building2 className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t("لا توجد وحدات لعرض التغطية", "No units available for coverage view")}</h2>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          {t(
            "عند إضافة وحدات وتوزيع الفرق عليها ستظهر هنا مصفوفة التغطية التشغيلية كاملة.",
            "Once units are added and teams are assigned, the full operational coverage matrix will appear here."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>{t("الوحدة", "Unit")}</th>
            <th>{t("المشرف", "Supervisor")}</th>
            <th>{t("التنظيف", "Housekeeping")}</th>
            <th>{t("الصيانة", "Maintenance")}</th>
            <th>{t("الاكتمال", "Coverage")}</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const hasFullCoverage = Boolean(
              unit.supervisor && unit.housekeeping_team?.length && unit.maintenance_team?.length
            );

            return (
              <tr key={unit.id}>
                <td>
                  <div className="font-medium text-foreground">{unit.code}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{unit.name}</div>
                </td>
                <td>{unit.supervisor?.full_name ?? <span className="text-muted-foreground">{t("غير معين", "Unassigned")}</span>}</td>
                <td>
                  {unit.housekeeping_team?.length ? (
                    <div className="flex items-center gap-2">
                      <Brush className="h-4 w-4 text-primary" />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {t("{count} عضو", "{count} members", { count: unit.housekeeping_team.length })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("بدون فريق", "No team")}</span>
                  )}
                </td>
                <td>
                  {unit.maintenance_team?.length ? (
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-600" />
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        {t("{count} عضو", "{count} members", { count: unit.maintenance_team.length })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("بدون فريق", "No team")}</span>
                  )}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      hasFullCoverage
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                    }`}
                  >
                    {hasFullCoverage ? t("مكتملة", "Complete") : t("تحتاج تغطية", "Needs Coverage")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function UsersPageContent() {
  const { language, locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => usersApi.list(page),
  });

  const { data: unitsCoverageData, isLoading: unitsCoverageLoading } = useQuery({
    queryKey: ["users-page-units-coverage"],
    queryFn: () => unitsApi.list({ page: 1, page_size: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersApi.toggleActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });

  const onSubmit = async (formData: CreateUserForm) => {
    await createMutation.mutateAsync(formData);
    reset();
    setShowCreate(false);
  };

  const users = data?.items ?? [];
  const unitsCoverage = unitsCoverageData?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const usersLoaded = !isLoading && Boolean(data);
  const coverageLoaded = !unitsCoverageLoading && Boolean(unitsCoverageData);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesSearch =
          !normalizedSearch ||
          user.full_name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch);
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
      }),
    [users, normalizedSearch, roleFilter]
  );

  const activeCount = users.filter((user) => user.is_active).length;
  const coveredPeopleCount = users.filter(
    (user) =>
      (user.supervised_units?.length ?? 0) +
        (user.housekeeping_units?.length ?? 0) +
        (user.maintenance_units?.length ?? 0) >
      0
  ).length;
  const coverageGapCount = unitsCoverage.filter(
    (unit) => !unit.supervisor || !(unit.housekeeping_team?.length) || !(unit.maintenance_team?.length)
  ).length;

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة المستخدمين", "User Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t("إدارة المستخدمين والصلاحيات وتغطية الوحدات.", "Manage users, permissions, and unit coverage.")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "راجع الأدوار، حالة الحسابات، والوحدات المرتبطة بكل مستخدم من شاشة واحدة.",
                  "Review roles, account status, and the units linked to each user from one screen."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-4">
            <div className="hero-metric">
              <p className="section-kicker">{t("حجم الفريق", "Team Size")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{usersLoaded ? data?.total ?? 0 : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي المستخدمين", "Total users")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("الحسابات النشطة", "Active Accounts")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{usersLoaded ? activeCount : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("حسابات مفعلة", "Enabled accounts")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("المكلفون", "Assigned Staff")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{usersLoaded ? coveredPeopleCount : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("أعضاء مرتبطون بوحدات", "Members linked to units")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("فجوات التغطية", "Coverage Gaps")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{coverageLoaded ? coverageGapCount : "—"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("وحدات تحتاج استكمال التغطية", "Units that still need full coverage")}</p>
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
              placeholder={t("ابحث بالاسم أو البريد...", "Search by name or email...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRoleFilter("")}
              className={roleFilter === "" ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
            >
              {t("الكل", "All")}
            </button>
            {USER_ROLES.map((value) => (
              <button
                key={value}
                onClick={() => setRoleFilter(value)}
                className={roleFilter === value ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
              >
                {getRoleLabel(value, language)}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setShowCreate(true)} className="primary-action">
          <Plus className="h-4 w-4" />
          {t("مستخدم جديد", "New User")}
        </button>
      </div>

      <div className="data-table-shell">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("لا توجد نتائج مطابقة", "No matching results")}</h2>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {t(
                "غيّر البحث أو تصفية الدور، أو أضف مستخدمًا جديدًا لإثراء تغطية الفريق والصلاحيات.",
                "Change the search or role filter, or add a new user to strengthen team coverage and permissions."
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>{t("المستخدم", "User")}</th>
                  <th>{t("الدور", "Role")}</th>
                  <th>{t("نطاق المسؤولية", "Responsibility Scope")}</th>
                  <th>{t("الهاتف", "Phone")}</th>
                  <th>{t("تاريخ الإنشاء", "Created On")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("إجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {user.full_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.full_name}</div>
                          <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                        {getRoleLabel(user.role, language)}
                      </span>
                    </td>
                    <td>
                      <TeamSummaryCell user={user} />
                    </td>
                    <td className="text-muted-foreground" dir="ltr">{user.phone ?? "—"}</td>
                    <td className="text-muted-foreground">{formatDate(user.created_at, locale)}</td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        }`}
                      >
                        {user.is_active ? t("نشط", "Active") : t("موقوف", "Suspended")}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMutation.mutate({ id: user.id, is_active: !user.is_active })}
                        className={`secondary-action px-3 py-2 text-xs ${
                          user.is_active ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300"
                        }`}
                        title={user.is_active ? t("إيقاف", "Deactivate") : t("تفعيل", "Activate")}
                      >
                        {user.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="data-table-shell">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
          <div>
            <p className="section-kicker">{t("مصفوفة التغطية", "Coverage Matrix")}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{t("تغطية الوحدات بالمشرفين والفِرق", "Unit coverage by supervisors and teams")}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t(
                "هذا القسم يكشف أي وحدة بلا مشرف أو بلا فريق تنظيف أو صيانة، حتى تبقى إدارة الصلاحيات مرتبطة بالتشغيل الحقيقي.",
                "This section reveals any unit without a supervisor, housekeeping team, or maintenance team so permissions stay tied to real operations."
              )}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {coverageLoaded ? (
              <>
                <span className="font-semibold text-foreground">{unitsCoverage.length}</span> {t("وحدة", "units")}
              </>
            ) : (
              <span>{t("جاري تحميل التغطية...", "Loading coverage...")}</span>
            )}
          </div>
        </div>

        {unitsCoverageLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <UnitCoverageTable units={unitsCoverage} />
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="secondary-action"
          >
            {t("السابق", "Previous")}
          </button>
          <span className="secondary-action border-transparent bg-transparent shadow-none">
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
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
                <p className="section-kicker">{t("إضافة مستخدم", "Add User")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إضافة مستخدم جديد", "Add a New User")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "أنشئ حسابات الأدوار مباشرة من هذه الشاشة لتغطية التشغيل والمالية والصيانة والتنظيف بشكل واقعي.",
                    "Create role accounts directly from this screen to support operations, finance, maintenance, and housekeeping with real coverage."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("الاسم الكامل *", "Full Name *")}</label>
                <input {...register("full_name")} className="input-field" />
                {errors.full_name && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.full_name.message, language)}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("البريد الإلكتروني *", "Email Address *")}</label>
                <input {...register("email")} type="email" className="input-field" dir="ltr" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.email.message, language)}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("كلمة المرور *", "Password *")}</label>
                <input {...register("password")} type="password" className="input-field" dir="ltr" />
                {errors.password && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.password.message, language)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الدور *", "Role *")}</label>
                  <select {...register("role")} className="input-field">
                    {USER_ROLES.map((value) => (
                      <option key={value} value={value}>
                        {getRoleLabel(value, language)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الهاتف", "Phone")}</label>
                  <input {...register("phone")} className="input-field" dir="ltr" />
                </div>
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
                  {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("إنشاء المستخدم", "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}