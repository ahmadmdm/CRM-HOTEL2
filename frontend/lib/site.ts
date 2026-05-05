import type { Metadata } from "next";
import type { AppLanguage } from "@/lib/i18n";

type RouteKey =
  | "login"
  | "dashboard"
  | "units"
  | "bookings"
  | "customers"
  | "finance"
  | "operations"
  | "users"
  | "housekeeping"
  | "maintenance"
  | "app";

type LocalizedText = Record<AppLanguage, string>;

const BRAND_NAME: LocalizedText = {
  ar: "نظام إدارة الوحدات",
  en: "Units Management System",
};

const APP_DESCRIPTION: LocalizedText = {
  ar: "منصة تشغيل موحدة لإدارة الوحدات والحجوزات والمالية وفرق التشغيل.",
  en: "A unified operating platform for units, bookings, finance, and field teams.",
};

const ROUTE_TITLES: Record<RouteKey, LocalizedText> = {
  app: BRAND_NAME,
  login: { ar: "تسجيل الدخول", en: "Sign In" },
  dashboard: { ar: "لوحة القيادة", en: "Dashboard" },
  units: { ar: "الوحدات", en: "Units" },
  bookings: { ar: "الحجوزات", en: "Bookings" },
  customers: { ar: "العملاء", en: "Customers" },
  finance: { ar: "المالية", en: "Finance" },
  operations: { ar: "العمليات", en: "Operations" },
  users: { ar: "المستخدمون", en: "Users" },
  housekeeping: { ar: "مهام التنظيف", en: "Housekeeping Tasks" },
  maintenance: { ar: "تذاكر الصيانة", en: "Maintenance Tickets" },
};

const ROUTE_DESCRIPTIONS: Record<RouteKey, LocalizedText> = {
  app: APP_DESCRIPTION,
  login: {
    ar: "دخول آمن إلى لوحة إدارة الوحدات والحجوزات والمالية حسب الدور.",
    en: "Secure sign-in to the units, bookings, and finance workspace based on role.",
  },
  dashboard: {
    ar: "ملخص تشغيلي حي للوحدات والحجوزات والجاهزية من شاشة موحدة.",
    en: "A live operational snapshot of units, bookings, and readiness from one workspace.",
  },
  units: {
    ar: "إدارة مخزون الوحدات وتغطيتها التشغيلية وتعيين الفرق من شاشة واحدة.",
    en: "Manage the unit inventory, operational coverage, and team assignments from one screen.",
  },
  bookings: {
    ar: "متابعة الحجوزات من الإنشاء حتى الدخول والخروج مع عرض تشغيلي واضح.",
    en: "Track bookings from creation through check-in and check-out with a clear operational view.",
  },
  customers: {
    ar: "إدارة العملاء، تاريخهم، وحالات القائمة السوداء من واجهة واحدة.",
    en: "Manage customers, their history, and blacklist status from one interface.",
  },
  finance: {
    ar: "مراقبة الإيرادات والمصروفات والنتيجة المالية وفق بيانات التشغيل الفعلية.",
    en: "Monitor revenue, expenses, and net financial outcome based on live operating data.",
  },
  operations: {
    ar: "متابعة التنظيف والصيانة والطلبات اليومية من لوحة تشغيل مركزية.",
    en: "Oversee housekeeping, maintenance, and daily requests from a centralized operations board.",
  },
  users: {
    ar: "إدارة المستخدمين والصلاحيات وتغطية الوحدات بصورة احترافية واضحة.",
    en: "Manage users, permissions, and unit coverage with a clear professional structure.",
  },
  housekeeping: {
    ar: "واجهة ميدانية مبسطة لفريق التنظيف مع حالة المهام اليومية.",
    en: "A simplified field interface for the housekeeping team and daily task status.",
  },
  maintenance: {
    ar: "واجهة ميدانية سريعة لفريق الصيانة لاستلام التذاكر وإغلاقها.",
    en: "A fast field interface for the maintenance team to accept and resolve tickets.",
  },
};

function getRouteKey(pathname: string): RouteKey {
  if (pathname === "/login") return "login";
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/units")) return "units";
  if (pathname.startsWith("/bookings")) return "bookings";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/operations")) return "operations";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/housekeeping")) return "housekeeping";
  if (pathname.startsWith("/maintenance")) return "maintenance";
  return "app";
}

export function getBrandName(language: AppLanguage) {
  return BRAND_NAME[language];
}

export function getLocalizedRouteTitle(route: RouteKey, language: AppLanguage) {
  return ROUTE_TITLES[route][language];
}

export function getLocalizedRouteDescription(route: RouteKey, language: AppLanguage) {
  return ROUTE_DESCRIPTIONS[route][language];
}

export function resolveDocumentTitle(pathname: string, language: AppLanguage) {
  const route = getRouteKey(pathname);
  const brand = getBrandName(language);

  if (route === "app") {
    return brand;
  }

  return `${getLocalizedRouteTitle(route, language)} | ${brand}`;
}

export function buildAppMetadata(language: AppLanguage): Metadata {
  const title = getBrandName(language);
  const description = APP_DESCRIPTION[language];
  const locale = language === "ar" ? "ar_SA" : "en_US";

  return {
    title,
    description,
    applicationName: title,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title,
    },
    openGraph: {
      title,
      description,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildPageMetadata(route: Exclude<RouteKey, "app">, language: AppLanguage): Metadata {
  return {
    title: resolveDocumentTitle(`/${route === "dashboard" ? "" : route}`, language),
    description: getLocalizedRouteDescription(route, language),
  };
}