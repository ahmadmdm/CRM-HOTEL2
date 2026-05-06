// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "sub_admin"
  | "financial"
  | "operations"
  | "maintenance"
  | "housekeeping";

export type UnitStatus =
  | "vacant"
  | "reserved"
  | "occupied"
  | "waiting_cleaning"
  | "ready"
  | "maintenance";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type BookingChannel =
  | "direct"
  | "airbnb"
  | "booking_com"
  | "agoda"
  | "phone"
  | "walk_in"
  | "other";

export type TaskStatus = "pending" | "in_progress" | "done" | "skipped";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type FinanceCategory =
  | "rent"
  | "deposit"
  | "late_fee"
  | "service_fee"
  | "other_income"
  | "maintenance_cost"
  | "cleaning_cost"
  | "utilities"
  | "supplies"
  | "salary"
  | "tax"
  | "other_expense";

// ─── Models ───────────────────────────────────────────────────────────────────

export interface UserReference {
  id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
}

export interface UnitReference {
  id: string;
  code: string;
  name: string;
  status: UnitStatus;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  created_at: string;
  supervised_units?: UnitReference[];
  housekeeping_units?: UnitReference[];
  maintenance_units?: UnitReference[];
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  floor?: number;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  base_price_per_night?: number;
  base_price_per_month?: number;
  /** @deprecated use base_price_per_night */
  price_per_night?: number;
  /** @deprecated use base_price_per_month */
  price_per_month?: number;
  location?: string;
  amenities?: string[];
  images?: string[];
  smart_lock_code?: string;
  supervisor_id?: string | null;
  supervisor?: UserReference | null;
  housekeeping_team_ids?: string[];
  maintenance_team_ids?: string[];
  housekeeping_team?: UserReference[];
  maintenance_team?: UserReference[];
  status: UnitStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UnitSummary {
  id: string;
  name: string;
  code: string;
  status: UnitStatus;
  base_price_per_night?: number;
  base_price_per_month?: number;
  /** @deprecated */ price_per_night?: number;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  supervisor_id?: string | null;
  supervisor?: UserReference | null;
  housekeeping_team?: UserReference[];
  maintenance_team?: UserReference[];
}

export interface Customer {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  national_id?: string;
  nationality?: string;
  notes?: string;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  unit_id: string;
  customer_id: string;
  check_in: string;
  check_out: string;
  actual_check_in?: string;
  actual_check_out?: string;
  total_cost: number;
  tax_amount: number;
  deposit_amount: number;
  amount_paid: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  booking_channel: BookingChannel;
  guests_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  unit?: UnitSummary;
  customer?: { id: string; full_name: string; phone: string; is_blacklisted: boolean };
}

export interface RevenueRecord {
  id: string;
  unit_id: string;
  booking_id?: string;
  amount: number;
  category: FinanceCategory;
  description?: string;
  record_date: string;
  receipt_path?: string;
  created_at: string;
}

export interface ExpenseRecord {
  id: string;
  unit_id?: string;
  amount: number;
  category: FinanceCategory;
  description?: string;
  record_date: string;
  receipt_path?: string;
  created_at: string;
}

export interface FinanceSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  period_start: string;
  period_end: string;
}

export interface CleaningTask {
  id: string;
  unit_id: string;
  booking_id?: string;
  assigned_to?: string;
  scheduled_date?: string;
  status: TaskStatus;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  unit?: UnitSummary;
}

export interface MaintenanceTicket {
  id: string;
  unit_id: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_by?: string;
  unit?: UnitSummary;
  images?: string[];
  resolved_at?: string;
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
  errors?: { field?: string; message: string }[];
}

// ─── Auth Token Payload ────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  role: UserRole;
  full_name: string;
  exp: number;
  iat: number;
  type: string;
}
