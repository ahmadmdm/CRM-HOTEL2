"use client";

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/RouteErrorState";
import { useI18n } from "@/lib/i18n";

export default function HousekeepingError({
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
      eyebrow={t("استعادة التنظيف", "Housekeeping Recovery")}
      title={t("حدث خلل أثناء تحميل لوحة فريق التنظيف", "A problem occurred while loading the housekeeping board")}
      description={t("يمكنك إعادة مزامنة هذا المسار فقط لاسترجاع المهام المعلقة دون فقدان بقية الجلسة.", "You can resync this route only to recover pending tasks without losing the rest of the session.")}
      reset={reset}
    />
  );
}