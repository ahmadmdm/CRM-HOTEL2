"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authApi } from "@/lib/api/auth";
import { translateFormMessage, useI18n } from "@/lib/i18n";
import { toast } from "@/components/ui/toaster";
import { useAuthStore } from "@/stores/authStore";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    new_password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
    confirm_password: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "تأكيد كلمة المرور غير متطابق",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
    path: ["new_password"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === "string"
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }

  return undefined;
}

export function AccountSecurityPageContent() {
  const { user, logout } = useAuthStore();
  const { language, t } = useI18n();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordForm) =>
      authApi.changePassword({
        current_password: payload.current_password,
        new_password: payload.new_password,
      }),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      reset();
      toast({
        title: t("تم تحديث كلمة المرور", "Password updated"),
        description: t(
          "تم حفظ كلمة المرور الجديدة بنجاح. سيُطلب منك تسجيل الدخول مرة أخرى لحماية الجلسة.",
          "Your new password has been saved. You will be asked to sign in again to protect the session."
        ),
      });
      await logout();
    } catch (error) {
      toast({
        title: t("تعذر تحديث كلمة المرور", "Could not update password"),
        description:
          translateFormMessage(getApiErrorMessage(error), language) ||
          t("تحقق من كلمة المرور الحالية ثم حاول مرة أخرى.", "Verify your current password and try again."),
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">{t("الحساب والأمان", "Account & Security")}</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              {t("إدارة كلمة المرور الحالية بدون تدخل يدوي من الخادم", "Manage your password without manual server access")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              {t(
                "هذه الصفحة مخصصة لتحديث كلمة مرور الحساب الحالي بشكل آمن. بعد الحفظ سيتم إنهاء الجلسة الحالية وطلب تسجيل الدخول مجددًا.",
                "Use this page to update the current account password securely. After saving, the current session will be closed and sign-in will be required again."
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
            <div className="hero-metric">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">{t("الحساب الحالي", "Current Account")}</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{user?.full_name ?? t("مستخدم النظام", "System User")}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground" dir="ltr">{user?.email}</p>
            </div>

            <div className="hero-metric">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">{t("حماية الجلسة", "Session Protection")}</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {t("تسجيل دخول جديد بعد التحديث", "New sign-in required after update")}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {t(
                  "هذا يمنع استمرار الجلسة القديمة بعد تغيير بيانات الاعتماد.",
                  "This prevents the old session from continuing after credentials change."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-400/20 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {t("تحديث كلمة المرور", "Update password")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t(
                    "أدخل كلمة المرور الحالية ثم عيّن كلمة مرور جديدة بطول لا يقل عن 8 أحرف.",
                    "Enter your current password, then set a new password with at least 8 characters."
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("كلمة المرور الحالية", "Current password")}
                </label>
                <div className="relative">
                  <input
                    {...register("current_password")}
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="input-field pe-12"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showCurrentPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                    title={showCurrentPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.current_password && (
                  <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.current_password.message, language)}</p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t("كلمة المرور الجديدة", "New password")}
                  </label>
                  <div className="relative">
                    <input
                      {...register("new_password")}
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="input-field pe-12"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="absolute inset-y-0 end-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showNewPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                      title={showNewPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.new_password && (
                    <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.new_password.message, language)}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t("تأكيد كلمة المرور الجديدة", "Confirm new password")}
                  </label>
                  <div className="relative">
                    <input
                      {...register("confirm_password")}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="input-field pe-12"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute inset-y-0 end-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showConfirmPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                      title={showConfirmPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="mt-1 text-xs text-red-500">{translateFormMessage(errors.confirm_password.message, language)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="submit" disabled={isSubmitting || changePasswordMutation.isPending} className="primary-action disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting || changePasswordMutation.isPending
                    ? t("جارٍ تحديث كلمة المرور...", "Updating password...")
                    : t("حفظ كلمة المرور الجديدة", "Save new password")}
                </button>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="rounded-[22px] border border-white/45 bg-white/60 px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground dark:border-white/10 dark:bg-white/5"
                >
                  {t("إعادة تعيين الحقول", "Reset fields")}
                </button>
              </div>
            </form>
          </div>

          <aside className="surface-card p-5">
            <p className="section-kicker">{t("إرشادات الأمان", "Security Guidance")}</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                {t(
                  "استخدم كلمة مرور لا تقل عن 8 أحرف ويفضل أن تجمع بين الحروف الكبيرة والصغيرة والأرقام والرموز.",
                  "Use a password with at least 8 characters, preferably mixing uppercase, lowercase, numbers, and symbols."
                )}
              </p>
              <p>
                {t(
                  "لا تعِد استخدام كلمة المرور القديمة أو مشاركة بيانات الدخول عبر القنوات غير الآمنة.",
                  "Do not reuse your old password or share credentials through insecure channels."
                )}
              </p>
              <p>
                {t(
                  "بعد الحفظ سيُعاد توجيهك لتسجيل الدخول مجددًا باستخدام كلمة المرور الجديدة.",
                  "After saving, you will be redirected to sign in again using the new password."
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}