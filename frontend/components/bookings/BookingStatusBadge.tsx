import type { BookingStatus } from "@/types";
import { getBookingStatusLabel, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_META: Record<BookingStatus, { classes: string }> = {
  pending: {
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  confirmed: {
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  checked_in: {
    classes: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  },
  checked_out: {
    classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  cancelled: {
    classes: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  no_show: {
    classes: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { language } = useI18n();
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        meta.classes
      )}
    >
      {getBookingStatusLabel(status, language)}
    </span>
  );
}
