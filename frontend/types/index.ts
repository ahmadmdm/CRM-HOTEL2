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
export type LocationKind = "site" | "building" | "floor" | "wing" | "area";
export type OwnerType = "individual" | "company";
export type ContractStatus = "active" | "paused" | "ended";
export type TeamType = "housekeeping" | "maintenance";
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type JournalSource = "manual" | "revenue" | "expense" | "invoice" | "payment" | "owner_statement";
export type JournalStatus = "draft" | "posted" | "void";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type InvoiceRecipientType = "customer" | "owner";
export type InvoiceLineType =
  | "accommodation"
  | "service"
  | "tax"
  | "deposit"
  | "management_fee"
  | "owner_revenue"
  | "owner_expense"
  | "adjustment";
export type InvoicePaymentMethod = "cash" | "bank_transfer" | "card" | "online" | "other";

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
  location_id?: string | null;
  owner_id?: string | null;
  management_entity_id?: string | null;
  property_group_id?: string | null;
  is_managed_by_us: boolean;
  admin_fee_percent?: number | null;
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
  location_id?: string | null;
  owner_id?: string | null;
  management_entity_id?: string | null;
  property_group_id?: string | null;
  is_managed_by_us: boolean;
  admin_fee_percent?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  supervisor_id?: string | null;
  supervisor?: UserReference | null;
  housekeeping_team?: UserReference[];
  maintenance_team?: UserReference[];
}

export interface UnitLocation {
  id: string;
  name: string;
  code: string;
  kind: LocationKind;
  parent_id?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  name: string;
  owner_type: OwnerType;
  email?: string | null;
  phone?: string | null;
  national_id?: string | null;
  tax_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementEntity {
  id: string;
  name: string;
  code: string;
  manager_id?: string | null;
  is_internal: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyGroup {
  id: string;
  name: string;
  code: string;
  owner_id?: string | null;
  management_entity_id?: string | null;
  location_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitManagementContract {
  id: string;
  unit_id: string;
  owner_id?: string | null;
  management_entity_id?: string | null;
  property_group_id?: string | null;
  starts_on: string;
  ends_on?: string | null;
  admin_fee_percent: number;
  status: ContractStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  user_id: string;
  user: UserReference;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  team_type: TeamType;
  supervisor_id?: string | null;
  supervisor?: UserReference | null;
  members: TeamMember[];
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitTeamAssignment {
  unit_id: string;
  team_id: string;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
  journal_entry_id?: string | null;
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
  journal_entry_id?: string | null;
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

export interface Account {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id?: string | null;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  account?: Account | null;
  description?: string | null;
  debit: number;
  credit: number;
  unit_id?: string | null;
  owner_id?: string | null;
  management_entity_id?: string | null;
  booking_id?: string | null;
  invoice_id?: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  source: JournalSource;
  source_id?: string | null;
  status: JournalStatus;
  created_by?: string | null;
  posted_at?: string | null;
  lines: JournalLine[];
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceItem {
  account_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResponse {
  period_start: string;
  period_end: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  items: TrialBalanceItem[];
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_type: InvoiceLineType;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  total_amount: number;
  service_period_start?: string | null;
  service_period_end?: string | null;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  journal_entry_id?: string | null;
  payment_date: string;
  amount: number;
  method: InvoicePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  recipient_type: InvoiceRecipientType;
  status: InvoiceStatus;
  customer_id?: string | null;
  owner_id?: string | null;
  booking_id?: string | null;
  unit_id?: string | null;
  journal_entry_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  notes?: string | null;
  lines: InvoiceLine[];
  payments: InvoicePayment[];
  created_at: string;
  updated_at: string;
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
