"use client";

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/RouteErrorState";
import { useI18n } from "@/lib/i18n";

export default function DashboardError({
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
      eyebrow={t("استعادة لوحة القيادة", "Dashboard Recovery")}
      title={t("حدث خلل أثناء تحميل إحدى صفحات لوحة التحكم", "A problem occurred while loading part of the dashboard")}
      description={t("المشكلة محصورة في هذا المسار فقط، لذلك يمكنك إعادة تحميله مباشرة دون مغادرة منطقة العمل.", "The issue is limited to this route, so you can reload it directly without leaving the workspace.")}
      reset={reset}
    />
  );
}