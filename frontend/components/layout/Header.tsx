"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Sun, Moon, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { getRoleLabel, useI18n } from "@/lib/i18n";
import { toast } from "@/components/ui/toaster";
import { LanguageToggle } from "./LanguageToggle";
import { dashboardNavItems } from "./Sidebar";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { language, locale, t } = useI18n();
  const [query, setQuery] = useState("");

  const currentSection =
    dashboardNavItems.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ??
    dashboardNavItems.find((item) => item.href === "/");

  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      return;
    }

    const normalized = value.toLowerCase();
    const match = dashboardNavItems.find((item) => {
      const href = item.href.toLowerCase();
      const label = item.label[language].toLowerCase();
      return label.includes(normalized) || href.includes(normalized);
    });

    if (!match) {
      toast({
        title: t("لا توجد وجهة مطابقة", "No matching destination found"),
        description: t(
          "جرّب: الوحدات، الحجوزات، العملاء، المالية، المستخدمون أو الحساب والأمان.",
          "Try: units, bookings, customers, finance, users, or account security."
        ),
        variant: "destructive",
      });
      return;
    }

    router.push(match.href);
    setQuery("");
  };

  if (!user) {
    return (
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="surface-panel h-24 animate-pulse" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="surface-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-primary md:flex">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
              <p className="section-kicker">{t("لوحة المتابعة", "Workspace Overview")}</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
                {currentSection?.label[language] ?? t("لوحة القيادة", "Dashboard")}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{today}</span>
              <span className="h-1 w-1 rounded-full bg-primary/60" />
                <span>{getRoleLabel(user.role, language) || user.role}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <form
            onSubmit={handleSearch}
            className="hidden min-w-[260px] items-center gap-2 rounded-2xl border border-white/45 bg-white/60 px-3 py-2 text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5 md:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                "انتقل سريعًا إلى الوحدات أو الحجوزات...",
                "Jump quickly to units or bookings..."
              )}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </form>

          <LanguageToggle compact />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/45 bg-white/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground dark:border-white/10 dark:bg-white/5"
            aria-label={t("تبديل الثيم", "Toggle theme")}
            title={t("تبديل الثيم", "Toggle theme")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/45 bg-white/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground dark:border-white/10 dark:bg-white/5"
            aria-label={t("التنبيهات", "Notifications")}
            title={t("التنبيهات", "Notifications")}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
          </button>

          <div className="hidden items-center gap-3 rounded-[22px] border border-white/45 bg-white/65 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex">
            <div className="text-end">
              <p className="text-sm font-semibold leading-tight text-foreground">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(user.role, language) || user.role}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/20 text-sm font-bold text-primary">
              {user.full_name?.[0] ?? "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
