"use client";

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/RouteErrorState";
import { useI18n } from "@/lib/i18n";

export default function AuthError({
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
      eyebrow={t("استعادة المصادقة", "Authentication Recovery")}
      title={t("تعذر تجهيز مسار تسجيل الدخول الآن", "The sign-in route could not be prepared right now")}
      description={t("سنحاول إعادة تحميل شاشة المصادقة دون التأثير على بقية التطبيق أو حالة المتصفح.", "We will try to reload the authentication screen without affecting the rest of the application or browser state.")}
      reset={reset}
    />
  );
}