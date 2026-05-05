"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Building2, Loader2 } from "lucide-react";
import { translateFormMessage, useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { language, t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError("");
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      // Route based on role
      if (user?.role === "housekeeping") {
        router.replace("/housekeeping");
      } else if (user?.role === "maintenance") {
        router.replace("/maintenance");
      } else if (user?.role === "financial") {
        router.replace("/finance");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.detail ?? t("خطأ في تسجيل الدخول. حاول مرة أخرى.", "Login failed. Please try again.")
      );
    }
  };

  return (
    <div className="surface-panel relative overflow-hidden p-8 shadow-2xl animate-fade-in sm:p-10">
      <div className="pointer-events-none absolute inset-x-12 top-0 h-20 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative mb-8 flex flex-col items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-primary via-orange-400 to-amber-300 text-white shadow-lg shadow-primary/20">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <p className="section-kicker">{t("تسجيل الدخول", "Sign In")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{t("سجّل دخولك إلى النظام", "Sign in to the system")}</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {t(
              "استخدم حسابك للوصول إلى الوحدات والحجوزات والعمليات والمالية حسب صلاحيتك.",
              "Use your account to access units, bookings, operations, and finance according to your role."
            )}
          </p>
        </div>

        <div className="w-full rounded-[24px] border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold">{t("بيانات المدير الحالية", "Current admin credentials")}</p>
          <p className="mt-1 text-muted-foreground" dir="ltr">admin@crm.local / Admin@1234</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground/90">
            {t("البريد الإلكتروني", "Email address")}
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder={t("admin@example.com", "admin@example.com")}
            className="input-field"
            dir="ltr"
          />
          {errors.email && (
            <p className="text-red-500 text-xs">{translateFormMessage(errors.email.message, language)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground/90">
            {t("كلمة المرور", "Password")}
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-field pr-12"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              title={showPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
              aria-label={showPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs">{translateFormMessage(errors.password.message, language)}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-[20px] border border-red-500/15 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {translateFormMessage(serverError, language)}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-primary via-orange-400 to-amber-300 px-4 py-3 text-white shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("جاري تسجيل الدخول...", "Signing you in...")}
            </>
          ) : (
            t("تسجيل الدخول", "Sign In")
          )}
        </button>

        <p className="text-center text-xs leading-6 text-muted-foreground">
          {t(
            "بتنفيذ الدخول أنت تنتقل إلى الواجهة المناسبة لدورك تلقائيًا مع حماية كاملة للمسارات.",
            "After signing in, you are routed automatically to the correct workspace for your role with full route protection."
          )}
        </p>
      </form>
    </div>
  );
}
