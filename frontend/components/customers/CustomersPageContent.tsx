"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/customers";
import { formatDate } from "@/lib/utils";
import { translateFormMessage, useI18n } from "@/lib/i18n";
import { Plus, Search, Ban, CheckCircle, ShieldAlert, Sparkles, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Customer } from "@/types";

const createCustomerSchema = z.object({
  full_name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(9, "رقم الهاتف غير صحيح"),
  national_id: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  nationality: z.string().optional(),
});

type CreateCustomerForm = z.infer<typeof createCustomerSchema>;

export function CustomersPageContent() {
  const { language, locale, t } = useI18n();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { page, page_size: 15, is_blacklisted: showBlacklisted || undefined }],
    queryFn: () => customersApi.list({ page, page_size: 15, is_blacklisted: showBlacklisted || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const blacklistMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => customersApi.blacklist(id, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const removeBlacklistMutation = useMutation({
    mutationFn: (id: string) => customersApi.removeBlacklist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateCustomerForm>({ resolver: zodResolver(createCustomerSchema) });

  const onSubmit = async (formData: CreateCustomerForm) => {
    await createMutation.mutateAsync(formData);
    reset();
    setShowCreate(false);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const items = data?.items ?? [];
  const filteredCustomers = useMemo(
    () =>
      items.filter(
        (customer) =>
          !normalizedSearch ||
          customer.full_name.toLowerCase().includes(normalizedSearch) ||
          customer.phone.includes(search)
      ),
    [items, normalizedSearch, search]
  );

  const blacklistedCount = items.filter((customer) => customer.is_blacklisted).length;

  const handleBlacklistSubmit = async () => {
    if (!selectedCustomer || !blacklistReason.trim()) {
      return;
    }

    await blacklistMutation.mutateAsync({ id: selectedCustomer.id, reason: blacklistReason.trim() });
    setSelectedCustomer(null);
    setBlacklistReason("");
  };

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة العملاء", "Customer Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t(
                  "متابعة العملاء وحالات الحظر من شاشة واحدة.",
                  "Track customers and blacklist status from one screen."
                )}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "اعرض بيانات العميل، وتابع نشاطه، ونفذ الحظر عند الحاجة مع سجل واضح.",
                  "Review customer details, follow activity, and apply blacklisting when needed with a clear record."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="hero-metric">
              <p className="section-kicker">{t("إجمالي العملاء", "Total Customers")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{data?.total ?? 0}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي العملاء", "All customer records")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("النتائج المعروضة", "Visible Results")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{filteredCustomers.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("نتائج التصفية الحالية", "Current filter results")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("القائمة السوداء", "Blacklist")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{blacklistedCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("حالات ضمن القائمة السوداء", "Customers on the blacklist")}</p>
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
              placeholder={t("ابحث بالاسم أو الهاتف...", "Search by name or phone...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            onClick={() => setShowBlacklisted(!showBlacklisted)}
            className={showBlacklisted ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
          >
            <Ban className="h-3.5 w-3.5" />
            {t("القائمة السوداء", "Blacklist")}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredCustomers.length}</span> {t("عميل ظاهر", "visible customers")}
          </div>
          <button onClick={() => setShowCreate(true)} className="primary-action">
            <Plus className="h-4 w-4" />
            {t("عميل جديد", "New Customer")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="data-table-shell p-6 space-y-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("لا توجد نتائج مطابقة", "No matching results")}</h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {t(
              "غيّر عبارة البحث أو أضف عميلًا جديدًا لبدء إدارة قاعدة العملاء بشكل واقعي.",
              "Change the search phrase or add a new customer to start building the customer base."
            )}
          </p>
        </div>
      ) : (
        <div className="data-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>{t("الاسم", "Name")}</th>
                  <th>{t("الهاتف", "Phone")}</th>
                  <th>{t("الجنسية", "Nationality")}</th>
                  <th>{t("تاريخ التسجيل", "Created On")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("إجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary text-sm font-bold">
                          {customer.full_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">{customer.email || t("بدون بريد", "No email")}</p>
                        </div>
                      </div>
                    </td>
                    <td dir="ltr">{customer.phone}</td>
                    <td className="text-muted-foreground">{customer.nationality ?? "—"}</td>
                    <td className="text-muted-foreground">{formatDate(customer.created_at, locale)}</td>
                    <td>
                      {customer.is_blacklisted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {t("محظور", "Blacklisted")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t("نشط", "Active")}
                        </span>
                      )}
                    </td>
                    <td>
                      {customer.is_blacklisted ? (
                        <button
                          onClick={() => removeBlacklistMutation.mutate(customer.id)}
                          className="secondary-action px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                        >
                          {t("رفع الحظر", "Remove Blacklist")}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setBlacklistReason("");
                          }}
                          className="secondary-action px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                        >
                          {t("حظر", "Blacklist")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.total > 15 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="secondary-action">
            {t("السابق", "Previous")}
          </button>
          <span className="secondary-action border-transparent bg-transparent shadow-none">
            {page} / {Math.ceil(data.total / 15)}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= Math.ceil(data.total / 15)}
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
                <p className="section-kicker">{t("إضافة عميل", "Add Customer")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إضافة عميل جديد", "Add a New Customer")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "أدخل الحد الأدنى من البيانات لتظهر سجلات العميل فورًا في الحجوزات وسجل العملاء.",
                    "Enter the minimum required details so the customer record appears immediately in bookings and the customer register."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("الاسم الكامل *", "Full Name *")}</label>
                <input {...register("full_name")} className="input-field" />
                {errors.full_name && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.full_name.message, language)}</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("رقم الهاتف *", "Phone Number *")}</label>
                  <input {...register("phone")} className="input-field" dir="ltr" />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.phone.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("البريد الإلكتروني", "Email Address")}</label>
                  <input {...register("email")} type="email" className="input-field" dir="ltr" />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.email.message, language)}</p>}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("رقم الهوية", "National ID")}</label>
                  <input {...register("national_id")} className="input-field" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الجنسية", "Nationality")}</label>
                  <input {...register("nationality")} className="input-field" />
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
                  {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="modal-shell max-w-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("إضافة إلى القائمة السوداء", "Add to Blacklist")}</h2>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  {t(
                    "سيتم توثيق سبب الحظر على ملف {name} ليظهر لاحقًا لجميع المستخدمين المخولين.",
                    "The reason for blacklisting {name} will be recorded and shown later to all authorized users.",
                    { name: selectedCustomer.full_name }
                  )}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t("سبب الحظر *", "Blacklist Reason *")}</label>
              <textarea
                value={blacklistReason}
                onChange={(event) => setBlacklistReason(event.target.value)}
                rows={4}
                className="input-field resize-none"
                placeholder={t(
                  "اشرح سبب الحظر أو المخالفة المسجلة على العميل",
                  "Explain the reason for blacklisting or the recorded violation for this customer"
                )}
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setBlacklistReason("");
                }}
                className="secondary-action"
              >
                {t("إلغاء", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleBlacklistSubmit}
                disabled={!blacklistReason.trim() || blacklistMutation.isPending}
                className="primary-action disabled:opacity-50"
              >
                {blacklistMutation.isPending ? t("جاري الحفظ...", "Saving...") : t("تأكيد الحظر", "Confirm Blacklist")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
