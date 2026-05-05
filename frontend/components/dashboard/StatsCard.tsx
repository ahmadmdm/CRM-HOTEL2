"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "emerald" | "amber" | "purple" | "red";
  sub?: string;
  loading?: boolean;
}

const colorMap = {
  blue: {
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-200",
    glow: "bg-sky-500/10",
    stripe: "from-sky-500 to-cyan-400",
  },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    glow: "bg-emerald-500/10",
    stripe: "from-emerald-500 to-lime-400",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-200",
    glow: "bg-amber-500/10",
    stripe: "from-amber-500 to-orange-400",
  },
  purple: {
    chip: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200",
    glow: "bg-fuchsia-500/10",
    stripe: "from-fuchsia-500 to-violet-400",
  },
  red: {
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-200",
    glow: "bg-rose-500/10",
    stripe: "from-rose-500 to-orange-400",
  },
};

export function StatsCard({ title, value, icon: Icon, color, sub, loading }: StatsCardProps) {
  const styles = colorMap[color];

  return (
    <div className="surface-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", styles.stripe)} />
      <div className={cn("pointer-events-none absolute -left-6 top-4 h-24 w-24 rounded-full blur-3xl", styles.glow)} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-20 rounded-2xl bg-muted animate-pulse" />
          ) : (
            <p className="metric-value mt-3">{value}</p>
          )}
          {sub && !loading && (
            <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 shadow-sm dark:border-white/10", styles.chip)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
