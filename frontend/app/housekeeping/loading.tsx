"use client";

import { RouteLoadingState } from "@/components/ui/RouteLoadingState";
import { useI18n } from "@/lib/i18n";

export default function HousekeepingLoading() {
  const { t } = useI18n();

  return (
    <RouteLoadingState
      eyebrow={t("التنظيف", "Housekeeping")}
      title={t("جارٍ تحضير قائمة مهام التنظيف اليومية", "Preparing the daily housekeeping task list")}
      description={t("نرتب المهام والوحدات المرتبطة بها قبل إظهار مساحة العمل الخاصة بفريق التنظيف.", "We are organizing the tasks and their related units before showing the housekeeping workspace.")}
    />
  );
}