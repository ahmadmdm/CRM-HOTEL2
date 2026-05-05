"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBookings, useCheckIn, useCheckOut, useCancelBooking, useCreateBooking } from "@/hooks/useBookings";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getBookingChannelLabel, getBookingStatusLabel, translateFormMessage, useI18n } from "@/lib/i18n";
import { customersApi } from "@/lib/api/customers";
import { unitsApi } from "@/lib/api/units";
import type { BookingChannel, BookingStatus } from "@/types";
import { Plus, Search, LogIn, LogOut, X, CalendarDays, Hotel, Wallet, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createBookingSchema = z.object({
  unit_id: z.string().uuid("يرجى اختيار الوحدة"),
  customer_id: z.string().uuid("يرجى اختيار العميل"),
  check_in: z.string().min(1, "تاريخ الدخول مطلوب"),
  check_out: z.string().min(1, "تاريخ الخروج مطلوب"),
  total_cost: z.number().min(0, "المبلغ مطلوب"),
  booking_channel: z.enum(["direct", "airbnb", "booking_com", "agoda", "phone", "walk_in", "other"]),
  guests_count: z.number().int().min(1).max(20),
  notes: z.string().optional(),
});

type CreateBookingForm = z.infer<typeof createBookingSchema>;

const STATUS_VALUES: Array<BookingStatus | ""> = ["", "pending", "confirmed", "checked_in", "checked_out", "cancelled"];

const CHANNEL_OPTIONS: BookingChannel[] = ["direct", "airbnb", "booking_com", "agoda", "phone", "walk_in", "other"];

export function BookingsPageContent() {
  const { language, locale, t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBookings({
    page,
    page_size: 15,
    status: statusFilter || undefined,
  });

  const { data: unitsLookup } = useQuery({
    queryKey: ["booking-unit-options"],
    queryFn: () => unitsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: customersLookup } = useQuery({
    queryKey: ["booking-customer-options"],
    queryFn: () => customersApi.list({ page: 1, page_size: 100 }),
  });

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const cancel = useCancelBooking();
  const createBooking = useCreateBooking();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingForm>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      booking_channel: "direct",
      guests_count: 1,
    },
  });

  const onCreateSubmit = async (formData: CreateBookingForm) => {
    await createBooking.mutateAsync(formData);
    reset({ booking_channel: "direct", guests_count: 1 });
    setShowCreate(false);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const items = data?.items ?? [];
  const filteredBookings = useMemo(
    () =>
      items.filter(
        (booking) =>
          !normalizedSearch ||
          booking.customer?.full_name?.toLowerCase().includes(normalizedSearch) ||
          booking.unit?.code?.toLowerCase().includes(normalizedSearch)
      ),
    [items, normalizedSearch]
  );

  const checkedInCount = items.filter((booking) => booking.status === "checked_in").length;
  const confirmedCount = items.filter((booking) => booking.status === "confirmed").length;
  const visibleRevenue = filteredBookings.reduce((sum, booking) => sum + Number(booking.total_cost ?? 0), 0);
  const statusOptions = STATUS_VALUES.map((value) => ({
    value,
    label: value ? getBookingStatusLabel(value, language) : t("الكل", "All"),
  }));

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("إدارة الحجوزات", "Bookings Management")}
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                {t(
                  "متابعة الحجوزات من الإنشاء حتى الدخول والخروج.",
                  "Track bookings from creation through check-in and check-out."
                )}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "اعرض الحجوزات الحالية، وأنشئ حجزًا جديدًا، وتابع حالاته من نفس الشاشة.",
                  "Review current bookings, create new ones, and follow every status from the same screen."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="hero-metric">
              <p className="section-kicker">{t("إجمالي الحجوزات", "Total Bookings")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{data?.total ?? 0}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("إجمالي الحجوزات", "All recorded bookings")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("الإقامات الحالية", "Current Stays")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{checkedInCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("نزلاء مقيمون حاليًا", "Guests currently checked in")}</p>
            </div>
            <div className="hero-metric">
              <p className="section-kicker">{t("قيمة النتائج", "Visible Revenue")}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(visibleRevenue, "SAR", locale)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("قيمة النتائج المعروضة", "Value of the currently visible results")}</p>
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
              placeholder={t("ابحث باسم العميل أو كود الوحدة...", "Search by customer name or unit code...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-1 flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as BookingStatus | "")}
                className={statusFilter === opt.value ? "filter-chip filter-chip-active" : "filter-chip text-foreground hover:-translate-y-0.5"}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredBookings.length}</span> {t("حجز ظاهر", "visible bookings")}
            <span className="mx-2 text-border">•</span>
            <span className="font-semibold text-foreground">{confirmedCount}</span> {t("بانتظار الدخول", "waiting for check-in")}
          </div>
          <button onClick={() => setShowCreate(true)} className="primary-action">
            <Plus className="h-4 w-4" />
            {t("حجز جديد", "New Booking")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="data-table-shell p-6 space-y-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("لا توجد حجوزات مطابقة لهذه التصفية", "No bookings match this filter")}</h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {t(
              "جرّب بحثًا آخر أو غيّر حالة التصفية، أو أنشئ حجزًا جديدًا لبدء دورة التشغيل.",
              "Try a different search, change the status filter, or create a new booking to start the workflow."
            )}
          </p>
        </div>
      ) : (
        <div className="data-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>{t("العميل", "Customer")}</th>
                  <th>{t("الوحدة", "Unit")}</th>
                  <th>{t("الدخول", "Check-in")}</th>
                  <th>{t("الخروج", "Check-out")}</th>
                  <th>{t("القيمة", "Value")}</th>
                  <th>{t("القناة", "Channel")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("إجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Hotel className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{booking.customer?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{t("{count} ضيوف", "{count} guests", { count: booking.guests_count })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-medium text-foreground">{booking.unit?.code ?? "—"}</td>
                    <td>{formatDate(booking.check_in, locale)}</td>
                    <td>{formatDate(booking.check_out, locale)}</td>
                    <td>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <Wallet className="h-3.5 w-3.5" />
                        {formatCurrency(booking.total_cost, "SAR", locale)}
                      </div>
                    </td>
                    <td className="text-muted-foreground">{getBookingChannelLabel(booking.booking_channel, language)}</td>
                    <td>
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => checkIn.mutate(booking.id)}
                            title={t("تسجيل الدخول", "Check in")}
                            className="secondary-action px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            {t("دخول", "Check in")}
                          </button>
                        )}
                        {booking.status === "checked_in" && (
                          <button
                            onClick={() => checkOut.mutate(booking.id)}
                            title={t("تسجيل الخروج", "Check out")}
                            className="secondary-action px-3 py-2 text-xs text-sky-700 dark:text-sky-300"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            {t("خروج", "Check out")}
                          </button>
                        )}
                        {["pending", "confirmed"].includes(booking.status) && (
                          <button
                            onClick={() => cancel.mutate(booking.id)}
                            title={t("إلغاء", "Cancel")}
                            className="secondary-action px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("إلغاء", "Cancel")}
                          </button>
                        )}
                      </div>
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
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="secondary-action"
          >
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
                <p className="section-kicker">{t("إنشاء حجز", "Create Booking")}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{t("إنشاء حجز جديد", "Create a New Booking")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "اختر الوحدة والعميل من القوائم الفعلية لتقليل الأخطاء وتسريع الإدخال اليومي.",
                    "Choose the unit and customer from the live lists to reduce mistakes and speed up daily entry."
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("الوحدة *", "Unit *")}</label>
                  <select {...register("unit_id")} className="input-field">
                    <option value="">{t("اختر الوحدة", "Choose a unit")}</option>
                    {unitsLookup?.items.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                    ))}
                  </select>
                  {errors.unit_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.unit_id.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("العميل *", "Customer *")}</label>
                  <select {...register("customer_id")} className="input-field">
                    <option value="">{t("اختر العميل", "Choose a customer")}</option>
                    {customersLookup?.items.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.full_name} - {customer.phone}</option>
                    ))}
                  </select>
                  {errors.customer_id && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.customer_id.message, language)}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("تاريخ الدخول *", "Check-in Date *")}</label>
                  <input {...register("check_in")} type="date" className="input-field" />
                  {errors.check_in && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.check_in.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("تاريخ الخروج *", "Check-out Date *")}</label>
                  <input {...register("check_out")} type="date" className="input-field" />
                  {errors.check_out && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.check_out.message, language)}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("إجمالي المبلغ *", "Total Amount *")}</label>
                  <input {...register("total_cost", { valueAsNumber: true })} type="number" min="0" className="input-field" />
                  {errors.total_cost && <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.total_cost.message, language)}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("عدد الضيوف", "Guests Count")}</label>
                  <input {...register("guests_count", { valueAsNumber: true })} type="number" min="1" max="20" className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t("قناة الحجز", "Booking Channel")}</label>
                  <select {...register("booking_channel")} className="input-field">
                    {CHANNEL_OPTIONS.map((value) => (
                      <option key={value} value={value}>{getBookingChannelLabel(value, language)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("ملاحظات", "Notes")}</label>
                <textarea {...register("notes")} rows={3} className="input-field resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    reset({ booking_channel: "direct", guests_count: 1 });
                  }}
                  className="secondary-action"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" disabled={isSubmitting} className="primary-action disabled:opacity-50">
                  {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("تأكيد الحجز", "Confirm Booking")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
