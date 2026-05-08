"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  TrendingUp,
  Wrench,
  ChevronLeft,
  Building,
  LogOut,
  UserCog,
  KeyRound,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { getRoleSummary, pick, type AppLanguage, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavLabel = { ar: string; en: string };

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: NavLabel;
  roles: string[];
};

export const dashboardNavItems: NavItem[] = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: { ar: "لوحة القيادة", en: "Dashboard" },
    roles: ["super_admin", "sub_admin", "financial", "operations"],
  },
  {
    href: "/units",
    icon: Building2,
    label: { ar: "الوحدات", en: "Units" },
    roles: ["super_admin", "sub_admin", "operations"],
  },
  {
    href: "/bookings",
    icon: CalendarDays,
    label: { ar: "الحجوزات", en: "Bookings" },
    roles: ["super_admin", "sub_admin", "operations"],
  },
  {
    href: "/customers",
    icon: Users,
    label: { ar: "العملاء", en: "Customers" },
    roles: ["super_admin", "sub_admin", "operations"],
  },
  {
    href: "/finance",
    icon: TrendingUp,
    label: { ar: "المالية", en: "Finance" },
    roles: ["super_admin", "financial"],
  },
  {
    href: "/operations",
    icon: Wrench,
    label: { ar: "العمليات", en: "Operations" },
    roles: ["super_admin", "sub_admin", "operations", "maintenance"],
  },
  {
    href: "/users",
    icon: UserCog,
    label: { ar: "المستخدمون", en: "Users" },
    roles: ["super_admin"],
  },
  {
    href: "/account",
    icon: KeyRound,
    label: { ar: "الحساب والأمان", en: "Account & Security" },
    roles: ["super_admin", "sub_admin", "financial", "operations", "maintenance", "housekeeping"],
  },
];

function getNavLabel(item: NavItem, language: AppLanguage) {
  return item.label[language];
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { sidebarState, toggleSidebar } = useUIStore();
  const { language, t } = useI18n();
  const collapsed = sidebarState === "collapsed";

  const visibleItems = dashboardNavItems.filter((item) =>
    item.roles.includes(user?.role ?? "")
  );

  if (!user) {
    return (
      <aside className="hidden lg:flex lg:w-[290px] lg:shrink-0 lg:px-4 lg:py-5">
        <div className="surface-panel h-[calc(100vh-2.5rem)] w-full animate-pulse" />
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex lg:w-[290px] lg:shrink-0 lg:px-4 lg:py-5">
      <div
        className={cn(
          "surface-panel relative flex h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden px-4 py-5 transition-all duration-300",
          collapsed ? "px-3" : "px-4"
        )}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative mb-6 flex items-center justify-between gap-3 rounded-[26px] border border-white/35 bg-white/45 px-4 py-4 dark:border-white/5 dark:bg-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-400 to-amber-300 text-white shadow-lg shadow-primary/20">
              <Building className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="section-kicker">{t("منصة التشغيل", "Operations Platform")}</p>
                <p className="truncate text-sm font-semibold text-foreground">{t("نظام الوحدات السكنية", "Residential Units System")}</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/60 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground dark:border-white/10 dark:bg-white/5"
            aria-label={t("طي أو توسيع القائمة", "Collapse or expand sidebar")}
            title={t("طي أو توسيع القائمة", "Collapse or expand sidebar")}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {!collapsed && (
          <div className="relative mb-5 rounded-[28px] border border-white/35 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-5 text-white shadow-2xl dark:border-white/5">
            <div className="absolute inset-x-5 top-0 h-16 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker text-white/60">{t("مركز التشغيل", "Operations Hub")}</p>
                <h2 className="mt-2 text-lg font-semibold leading-snug">
                  {t(
                    "تشغيل الوحدات والحجوزات والمالية من واجهة واحدة",
                    "Run units, bookings, and finance from one workspace"
                  )}
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
            </div>
          </div>
        )}

        <nav className="relative flex-1 space-y-2 overflow-y-auto pb-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                    : "text-muted-foreground hover:bg-white/55 hover:text-foreground dark:hover:bg-white/5"
                )}
                title={getNavLabel(item, language)}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "bg-white/50 text-muted-foreground group-hover:text-foreground dark:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {!collapsed && <span className="truncate">{getNavLabel(item, language)}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto space-y-3">
          {!collapsed && (
            <div className="rounded-[24px] border border-white/35 bg-white/55 p-3 dark:border-white/5 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-400/20 text-sm font-bold text-primary">
                  {user.full_name?.[0] ?? "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getRoleSummary(user.role, language) || user.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              void logout();
            }}
            className="flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
            title={t("تسجيل الخروج", "Log out")}
            aria-label={t("تسجيل الخروج", "Log out")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/50 text-inherit dark:bg-white/5">
              <LogOut className="h-4 w-4 shrink-0" />
            </div>
            {!collapsed && <span>{t("تسجيل الخروج", "Log out")}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileDock() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { language } = useI18n();

  if (!user) {
    return null;
  }

  const availableItems = dashboardNavItems.filter((item) => item.roles.includes(user.role));

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="surface-panel mobile-dock-scroll mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-2 py-2">
        {availableItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all duration-200",
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                  : "text-muted-foreground hover:bg-white/55 hover:text-foreground dark:hover:bg-white/5"
              )}
              aria-current={active ? "page" : undefined}
              title={getNavLabel(item, language)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="w-full truncate text-center">{getNavLabel(item, language)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
