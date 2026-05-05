"use client";

import { RouteLoadingState } from "@/components/ui/RouteLoadingState";
import { useI18n } from "@/lib/i18n";

export default function DashboardLoading() {
  const { t } = useI18n();

  return (
    <RouteLoadingState
      eyebrow={t("تحميل لوحة القيادة", "Dashboard Loading")}
      title={t("جارٍ تجهيز مساحة التحكم والإحصاءات الأساسية", "Preparing the workspace and core metrics")}
      description={t("نحضر بيانات الوحدات، الحجوزات، والعمليات في خلفية الواجهة قبل عرض الصفحة كاملة.", "We are loading unit, booking, and operations data in the background before the page is fully shown.")}
    />
  );
}