import type {
  BookingChannel,
  BookingStatus,
  FinanceCategory,
  UnitStatus,
  UserRole,
} from "@/types";
import { useUIStore } from "@/stores/uiStore";

export type AppLanguage = "ar" | "en";

type LocalizedText = {
  ar: string;
  en: string;
};

const ROLE_LABELS: Record<UserRole, LocalizedText> = {
  super_admin: { ar: "مدير عام", en: "Super Admin" },
  sub_admin: { ar: "مدير فرعي", en: "Sub Admin" },
  financial: { ar: "مالية", en: "Finance" },
  operations: { ar: "عمليات", en: "Operations" },
  maintenance: { ar: "صيانة", en: "Maintenance" },
  housekeeping: { ar: "تنظيف", en: "Housekeeping" },
};

const ROLE_SUMMARIES: Record<UserRole, LocalizedText> = {
  super_admin: { ar: "إدارة شاملة", en: "Full Administration" },
  sub_admin: { ar: "قيادة التشغيل", en: "Operations Lead" },
  financial: { ar: "المركز المالي", en: "Finance Desk" },
  operations: { ar: "تشغيل يومي", en: "Daily Operations" },
  maintenance: { ar: "الصيانة", en: "Maintenance" },
  housekeeping: { ar: "التنظيف", en: "Housekeeping" },
};

const UNIT_STATUS_LABELS: Record<UnitStatus, LocalizedText> = {
  vacant: { ar: "شاغرة", en: "Vacant" },
  ready: { ar: "جاهزة", en: "Ready" },
  reserved: { ar: "محجوزة", en: "Reserved" },
  occupied: { ar: "مشغولة", en: "Occupied" },
  waiting_cleaning: { ar: "بانتظار تنظيف", en: "Waiting for Cleaning" },
  maintenance: { ar: "صيانة", en: "Maintenance" },
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, LocalizedText> = {
  pending: { ar: "معلق", en: "Pending" },
  confirmed: { ar: "مؤكد", en: "Confirmed" },
  checked_in: { ar: "تم الدخول", en: "Checked In" },
  checked_out: { ar: "تم الخروج", en: "Checked Out" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  no_show: { ar: "لم يحضر", en: "No Show" },
};

const BOOKING_CHANNEL_LABELS: Record<BookingChannel, LocalizedText> = {
  direct: { ar: "مباشر", en: "Direct" },
  airbnb: { ar: "Airbnb", en: "Airbnb" },
  booking_com: { ar: "Booking.com", en: "Booking.com" },
  agoda: { ar: "Agoda", en: "Agoda" },
  phone: { ar: "هاتف", en: "Phone" },
  walk_in: { ar: "دخول مباشر", en: "Walk-in" },
  other: { ar: "أخرى", en: "Other" },
};

const FINANCE_CATEGORY_LABELS: Record<FinanceCategory, LocalizedText> = {
  rent: { ar: "إيجار", en: "Rent" },
  deposit: { ar: "تأمين", en: "Deposit" },
  late_fee: { ar: "رسوم تأخير", en: "Late Fee" },
  service_fee: { ar: "رسوم خدمة", en: "Service Fee" },
  other_income: { ar: "إيراد آخر", en: "Other Income" },
  maintenance_cost: { ar: "صيانة", en: "Maintenance" },
  cleaning_cost: { ar: "تنظيف", en: "Cleaning" },
  utilities: { ar: "خدمات", en: "Utilities" },
  supplies: { ar: "مستلزمات", en: "Supplies" },
  salary: { ar: "رواتب", en: "Salaries" },
  tax: { ar: "ضرائب", en: "Tax" },
  other_expense: { ar: "مصروف آخر", en: "Other Expense" },
};

const TICKET_PRIORITY_LABELS: Record<string, LocalizedText> = {
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  high: { ar: "عالي", en: "High" },
  urgent: { ar: "عاجل", en: "Urgent" },
};

const TICKET_STATUS_LABELS: Record<string, LocalizedText> = {
  open: { ar: "مفتوح", en: "Open" },
  in_progress: { ar: "جاري", en: "In Progress" },
  resolved: { ar: "محلول", en: "Resolved" },
  closed: { ar: "مغلق", en: "Closed" },
};

const VALIDATION_MESSAGES: Record<string, LocalizedText> = {
  "الكود مطلوب": { ar: "الكود مطلوب", en: "Code is required" },
  "الاسم مطلوب": { ar: "الاسم مطلوب", en: "Name is required" },
  "السعر مطلوب": { ar: "السعر مطلوب", en: "Price is required" },
  "بريد إلكتروني غير صحيح": { ar: "بريد إلكتروني غير صحيح", en: "Invalid email address" },
  "كلمة المرور 8 أحرف على الأقل": {
    ar: "كلمة المرور 8 أحرف على الأقل",
    en: "Password must be at least 8 characters",
  },
  "كلمة المرور مطلوبة": { ar: "كلمة المرور مطلوبة", en: "Password is required" },
  "كلمة المرور الحالية مطلوبة": {
    ar: "كلمة المرور الحالية مطلوبة",
    en: "Current password is required",
  },
  "تأكيد كلمة المرور مطلوب": {
    ar: "تأكيد كلمة المرور مطلوب",
    en: "Password confirmation is required",
  },
  "تأكيد كلمة المرور غير متطابق": {
    ar: "تأكيد كلمة المرور غير متطابق",
    en: "Password confirmation does not match",
  },
  "كلمة المرور الجديدة يجب أن تختلف عن الحالية": {
    ar: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
    en: "New password must be different from the current one",
  },
  "يرجى إدخال بريد إلكتروني صحيح": {
    ar: "يرجى إدخال بريد إلكتروني صحيح",
    en: "Please enter a valid email address",
  },
  "المبلغ يجب أن يكون أكبر من صفر": {
    ar: "المبلغ يجب أن يكون أكبر من صفر",
    en: "Amount must be greater than zero",
  },
  "التاريخ مطلوب": { ar: "التاريخ مطلوب", en: "Date is required" },
  "يرجى اختيار الوحدة": { ar: "يرجى اختيار الوحدة", en: "Please choose a unit" },
  "يرجى اختيار العميل": { ar: "يرجى اختيار العميل", en: "Please choose a customer" },
  "تاريخ الدخول مطلوب": { ar: "تاريخ الدخول مطلوب", en: "Check-in date is required" },
  "تاريخ الخروج مطلوب": { ar: "تاريخ الخروج مطلوب", en: "Check-out date is required" },
  "المبلغ مطلوب": { ar: "المبلغ مطلوب", en: "Amount is required" },
  "الاسم الكامل *": { ar: "الاسم الكامل *", en: "Full name *" },
  "رقم الهاتف غير صحيح": { ar: "رقم الهاتف غير صحيح", en: "Invalid phone number" },
  "يرجى اختيار وحدة صحيحة": {
    ar: "يرجى اختيار وحدة صحيحة",
    en: "Please choose a valid unit",
  },
  "الملاحظات طويلة أكثر من اللازم": {
    ar: "الملاحظات طويلة أكثر من اللازم",
    en: "Notes are too long",
  },
  "العنوان مطلوب": { ar: "العنوان مطلوب", en: "Title is required" },
  "خطأ في تسجيل الدخول. حاول مرة أخرى.": {
    ar: "خطأ في تسجيل الدخول. حاول مرة أخرى.",
    en: "Login failed. Please try again.",
  },
  "Current password is incorrect": {
    ar: "كلمة المرور الحالية غير صحيحة",
    en: "Current password is incorrect",
  },
  "New password must be different from the current password": {
    ar: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
    en: "New password must be different from the current password",
  },
  "User not found": {
    ar: "المستخدم غير موجود",
    en: "User not found",
  },
};

export function pick<T>(language: AppLanguage, arabic: T, english: T): T {
  return language === "ar" ? arabic : english;
}

function interpolate(template: string, values?: Record<string, string | number | null | undefined>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function readLocalizedText(text: LocalizedText | undefined, language: AppLanguage, fallback = "") {
  return text ? text[language] : fallback;
}

export function getLocale(language: AppLanguage) {
  return language === "ar" ? "ar-SA" : "en-US";
}

export function getRoleLabel(role: UserRole | null | undefined, language: AppLanguage) {
  if (!role) {
    return "";
  }

  return readLocalizedText(ROLE_LABELS[role], language, role);
}

export function getRoleSummary(role: UserRole | null | undefined, language: AppLanguage) {
  if (!role) {
    return "";
  }

  return readLocalizedText(ROLE_SUMMARIES[role], language, role);
}

export function getUnitStatusLabel(status: UnitStatus, language: AppLanguage) {
  return readLocalizedText(UNIT_STATUS_LABELS[status], language, status);
}

export function getBookingStatusLabel(status: BookingStatus, language: AppLanguage) {
  return readLocalizedText(BOOKING_STATUS_LABELS[status], language, status);
}

export function getBookingChannelLabel(channel: BookingChannel, language: AppLanguage) {
  return readLocalizedText(BOOKING_CHANNEL_LABELS[channel], language, channel);
}

export function getFinanceCategoryLabel(category: FinanceCategory, language: AppLanguage) {
  return readLocalizedText(FINANCE_CATEGORY_LABELS[category], language, category);
}

export function getTicketPriorityLabel(priority: string, language: AppLanguage) {
  return readLocalizedText(TICKET_PRIORITY_LABELS[priority], language, priority);
}

export function getTicketStatusLabel(status: string, language: AppLanguage) {
  return readLocalizedText(TICKET_STATUS_LABELS[status], language, status);
}

export function translateFormMessage(message: string | undefined, language: AppLanguage) {
  if (!message) {
    return "";
  }

  return readLocalizedText(VALIDATION_MESSAGES[message], language, message);
}

export function useI18n() {
  const language = useUIStore((state) => state.language);

  return {
    language,
    locale: getLocale(language),
    isArabic: language === "ar",
    dir: language === "ar" ? "rtl" : "ltr",
    t: (arabic: string, english: string, values?: Record<string, string | number | null | undefined>) =>
      interpolate(pick(language, arabic, english), values),
  };
}