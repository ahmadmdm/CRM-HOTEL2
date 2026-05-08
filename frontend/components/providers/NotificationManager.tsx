"use client";

import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "@/components/ui/toaster";
import { useI18n } from "@/lib/i18n";
import {
  getOneSignalPermissionState,
  requestOneSignalPermission,
  syncOneSignalUser,
} from "@/lib/onesignal";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

const BANNER_SNOOZE_MS = 1000 * 60 * 60 * 6;
const PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 12;
const BANNER_CHECK_INTERVAL_MS = 1000 * 60;
const DISMISS_KEY = "crm-notifications-banner-dismissed-until";
const PROMPT_KEY = "crm-notifications-last-prompted-at";

function readNumber(key: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const value = window.localStorage.getItem(key);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeNumber(key: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
}

function isAuthPath(pathname: string) {
  return pathname.startsWith("/login");
}

export function NotificationManager() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { t } = useI18n();
  const permission = useNotificationStore((state) => state.permission);
  const setPermission = useNotificationStore((state) => state.setPermission);
  const setConfigured = useNotificationStore((state) => state.setConfigured);
  const setPrompting = useNotificationStore((state) => state.setPrompting);
  const bindRequestPermission = useNotificationStore((state) => state.bindRequestPermission);
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? "";
  const [bannerVisible, setBannerVisible] = useState(false);

  const shouldRun = useMemo(() => Boolean(appId && user && !isAuthPath(pathname)), [appId, pathname, user]);

  useEffect(() => {
    setConfigured(Boolean(appId));
    if (!appId) {
      setPermission("unsupported");
      bindRequestPermission(null);
    }
  }, [appId, bindRequestPermission, setConfigured, setPermission]);

  useEffect(() => {
    if (!shouldRun) {
      bindRequestPermission(null);
      setBannerVisible(false);
      return;
    }

    let cancelled = false;

    const updatePermission = async () => {
      const nextPermission = await syncOneSignalUser(appId, user);
      if (!cancelled) {
        setPermission(nextPermission);
      }
    };

    void updatePermission();

    const requestPermission = async () => {
      setPrompting(true);
      writeNumber(PROMPT_KEY, Date.now());
      try {
        const nextPermission = await requestOneSignalPermission(appId);
        if (cancelled) {
          return;
        }

        setPermission(nextPermission);
        if (nextPermission === "granted") {
          setBannerVisible(false);
          toast({
            title: t("تم تفعيل الإشعارات", "Notifications enabled"),
            description: t(
              "ستصلك الآن تنبيهات فورية عند إسناد مهام التنظيف أو الصيانة إليك.",
              "You will now receive real-time alerts when housekeeping or maintenance work is assigned to you."
            ),
          });
          return;
        }

        toast({
          title: t("الإشعارات ما زالت غير مفعلة", "Notifications are still disabled"),
          description: t(
            "إذا كنت قد رفضت الطلب من المتصفح، افتح إعدادات الموقع واسمح بالإشعارات ثم أعد المحاولة.",
            "If the browser permission was denied, open the site settings, allow notifications, then try again."
          ),
          variant: "destructive",
        });
      } catch {
        if (!cancelled) {
          toast({
            title: t("تعذر تهيئة الإشعارات", "Unable to initialize notifications"),
            description: t(
              "تحقق من إعداد OneSignal ثم أعد المحاولة.",
              "Check the OneSignal setup and try again."
            ),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setPrompting(false);
        }
      }
    };

    bindRequestPermission(requestPermission);

    return () => {
      cancelled = true;
      bindRequestPermission(null);
    };
  }, [appId, bindRequestPermission, setPermission, setPrompting, shouldRun, t, user]);

  useEffect(() => {
    if (!shouldRun) {
      return;
    }

    const evaluateBanner = () => {
      const currentPermission = getOneSignalPermissionState();
      setPermission(currentPermission);

      if (currentPermission === "granted") {
        setBannerVisible(false);
        return;
      }

      const now = Date.now();
      const dismissedUntil = readNumber(DISMISS_KEY);
      setBannerVisible(now >= dismissedUntil);
    };

    evaluateBanner();
    const interval = window.setInterval(evaluateBanner, BANNER_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [setPermission, shouldRun]);

  useEffect(() => {
    if (!shouldRun || permission !== "default") {
      return;
    }

    const lastPromptedAt = readNumber(PROMPT_KEY);
    if (Date.now() - lastPromptedAt < PROMPT_COOLDOWN_MS) {
      return;
    }

    void useNotificationStore.getState().triggerPermissionRequest();
  }, [permission, shouldRun]);

  if (!shouldRun || !bannerVisible || permission === "granted") {
    return null;
  }

  const isDenied = permission === "denied";

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[26px] border border-amber-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 px-4 py-3 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-amber-300">
              {isDenied ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isDenied
                  ? t("فعّل الإشعارات من إعدادات المتصفح", "Enable notifications from browser settings")
                  : t("فعّل الإشعارات الفورية لهذا النظام", "Enable real-time notifications for this system")}
              </p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                {isDenied
                  ? t(
                      "تم رفض الإذن سابقًا. بعد السماح بالإشعارات من إعدادات الموقع ستصلك تنبيهات فورية عند إسناد التنظيف أو الصيانة أو أي حدث تشغيلي مهم.",
                      "Permission was denied earlier. Once you allow notifications in the site settings, you will receive real-time alerts for housekeeping, maintenance, and other operational events."
                    )
                  : t(
                      "استقبل تنبيهات احترافية مباشرة عند إسناد مهام التنظيف والصيانة أو عند ظهور أحداث تشغيلية مهمة على حسابك.",
                      "Receive professional real-time alerts when housekeeping or maintenance work is assigned to you, or when other important operational events affect your account."
                    )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                writeNumber(DISMISS_KEY, Date.now() + BANNER_SNOOZE_MS);
                setBannerVisible(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={t("إخفاء التذكير مؤقتًا", "Dismiss reminder temporarily")}
              title={t("إخفاء التذكير مؤقتًا", "Dismiss reminder temporarily")}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                void useNotificationStore.getState().triggerPermissionRequest();
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              <Bell className="h-4 w-4" />
              {isDenied
                ? t("حاول التفعيل بعد السماح", "Retry after allowing")
                : t("تفعيل الإشعارات", "Enable notifications")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}