"use client";

import { RouteLoadingState } from "@/components/ui/RouteLoadingState";
import { useI18n } from "@/lib/i18n";

export default function AuthLoading() {
  const { t } = useI18n();

  return (
    <RouteLoadingState
      eyebrow={t("المصادقة", "Authentication")}
      title={t("جارٍ تجهيز بوابة الدخول الآمنة", "Preparing the secure sign-in gateway")}
      description={t("نحمّل عناصر الجلسة والواجهة الافتتاحية قبل عرض نموذج تسجيل الدخول للمستخدم.", "We are loading the session elements and the welcome surface before showing the sign-in form.")}
    />
  );
}