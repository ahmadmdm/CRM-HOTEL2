"use client";

import { RouteLoadingState } from "@/components/ui/RouteLoadingState";
import { useI18n } from "@/lib/i18n";

export default function MaintenanceLoading() {
  const { t } = useI18n();

  return (
    <RouteLoadingState
      eyebrow={t("الصيانة", "Maintenance")}
      title={t("جارٍ تجهيز تذاكر الصيانة ومسار المعالجة", "Preparing maintenance tickets and workflow")}
      description={t("نحمّل التذاكر والأولوية الحالية لكل وحدة قبل عرض مساحة العمل الخاصة بفريق الصيانة.", "We are loading tickets and the current priority for each unit before showing the maintenance workspace.")}
    />
  );
}