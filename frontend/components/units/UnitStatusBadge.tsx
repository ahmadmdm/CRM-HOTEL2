import type { UnitStatus } from "@/types";
import { getUnitStatusLabel, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_META: Record<UnitStatus, { classes: string }> = {
  vacant: {
    classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  ready: {
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  reserved: {
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  occupied: {
    classes: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  },
  waiting_cleaning: {
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  maintenance: {
    classes: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
};

export function UnitStatusBadge({
  status,
  size = "sm",
}: {
  status: UnitStatus;
  size?: "xs" | "sm";
}) {
  const { language } = useI18n();
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        meta.classes
      )}
    >
      {getUnitStatusLabel(status, language)}
    </span>
  );
}
