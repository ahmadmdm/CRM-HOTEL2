"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Booking } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { ArrowLeft } from "lucide-react";

interface RecentBookingsProps {
  bookings: Booking[];
  loading?: boolean;
}

export function RecentBookings({ bookings, loading }: RecentBookingsProps) {
  const { locale, t } = useI18n();

  return (
    <div className="surface-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">{t("آخر النشاطات", "Recent Activity")}</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{t("آخر الحجوزات", "Recent Bookings")}</h3>
        </div>
        <Link
          href="/bookings"
          className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-all hover:-translate-y-0.5"
        >
          {t("عرض الكل", "View all")}
          <ArrowLeft className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          {t("لا توجد حجوزات حديثة لعرضها الآن.", "There are no recent bookings to show right now.")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start pb-3 font-medium">{t("العميل", "Customer")}</th>
                <th className="text-start pb-3 font-medium">{t("الوحدة", "Unit")}</th>
                <th className="text-start pb-3 font-medium">{t("الدخول", "Check-in")}</th>
                <th className="text-start pb-3 font-medium">{t("الخروج", "Check-out")}</th>
                <th className="text-start pb-3 font-medium">{t("المبلغ", "Amount")}</th>
                <th className="text-start pb-3 font-medium">{t("الحالة", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking) => (
                <tr key={booking.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 font-medium">
                    {booking.customer?.full_name ?? "—"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {booking.unit?.code ?? "—"}
                  </td>
                  <td className="py-3">{formatDate(booking.check_in, locale)}</td>
                  <td className="py-3">{formatDate(booking.check_out, locale)}</td>
                  <td className="py-3 font-medium">
                    {formatCurrency(booking.total_cost, "SAR", locale)}
                  </td>
                  <td className="py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
