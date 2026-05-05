"use client";

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/RouteErrorState";
import { useI18n } from "@/lib/i18n";

export default function MaintenanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RouteErrorState
      eyebrow={t("استعادة الصيانة", "Maintenance Recovery")}
      title={t("تعذر تحميل لوحة الصيانة حاليًا", "The maintenance board could not be loaded right now")}
      description={t("المسار معزول ويمكن إعادة تحميله مباشرة لاسترجاع التذاكر النشطة وحالة التنفيذ.", "This route is isolated and can be reloaded directly to recover active tickets and execution state.")}
      reset={reset}
    />
  );
}