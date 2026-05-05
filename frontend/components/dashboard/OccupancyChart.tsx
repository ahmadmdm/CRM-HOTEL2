"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getUnitStatusLabel, useI18n } from "@/lib/i18n";
import type { UnitStatus } from "@/types";

interface OccupancyChartProps {
  statusSummary: Record<string, number>;
}

const STATUS_ORDER: UnitStatus[] = ["vacant", "ready", "reserved", "occupied", "waiting_cleaning", "maintenance"];

const STATUS_COLORS: Record<UnitStatus, string> = {
  vacant: "#94a3b8",
  ready: "#10b981",
  reserved: "#3b82f6",
  occupied: "#8b5cf6",
  waiting_cleaning: "#f59e0b",
  maintenance: "#ef4444",
};

export function OccupancyChart({ statusSummary }: OccupancyChartProps) {
  const { language, t } = useI18n();
  const data = STATUS_ORDER.map((status) => ({
    name: getUnitStatusLabel(status, language),
    value: statusSummary[status] ?? 0,
    color: STATUS_COLORS[status],
  })).filter((entry) => entry.value > 0);

  if (data.length === 0) {
    return (
      <div className="surface-card flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
          {t("لا توجد بيانات تشغيلية بعد", "No operational data yet")}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{t("ستظهر نسب الإشغال هنا فور تسجيل أول وحدة أو حجز", "Occupancy ratios will appear here as soon as the first unit or booking is recorded")}</h3>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          {t(
            "الرسم البياني ينعكس مباشرة عند تغيّر حالة الوحدات بين شاغرة ومحجوزة ومشغولة وتحت الصيانة.",
            "The chart updates immediately as unit statuses move between vacant, reserved, occupied, and maintenance."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">{t("الإشغال الحالي", "Current Occupancy")}</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{t("توزيع حالات الوحدات", "Unit Status Distribution")}</h3>
        </div>
        <div className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {t("{count} حالات فعالة", "{count} active statuses", { count: data.length })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [value, name]}
            labelFormatter={() => t("الحالة", "Status")}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              fontSize: "13px",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
