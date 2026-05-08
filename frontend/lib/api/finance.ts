import { apiClient } from "@/lib/api/client";
import type {
  RevenueRecord,
  ExpenseRecord,
  FinanceSummary,
  Account,
  Invoice,
  InvoicePayment,
  InvoiceRecipientType,
  InvoiceStatus,
  JournalEntry,
  JournalSource,
  PaginatedResponse,
  TrialBalanceResponse,
} from "@/types";

function toSearchParams(params?: object) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  return searchParams.toString();
}

export const financeApi = {
  createRevenue: async (data: Partial<RevenueRecord>): Promise<RevenueRecord> => {
    const response = await apiClient.post<RevenueRecord>("/finance/revenue", data);
    return response.data;
  },

  listRevenue: async (params?: {
    page?: number;
    page_size?: number;
    unit_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<RevenueRecord>> => {
    const response = await apiClient.get<PaginatedResponse<RevenueRecord>>(
      `/finance/revenue?${toSearchParams(params)}`
    );
    return response.data;
  },

  createExpense: async (data: Partial<ExpenseRecord>): Promise<ExpenseRecord> => {
    const response = await apiClient.post<ExpenseRecord>("/finance/expense", data);
    return response.data;
  },

  listExpenses: async (params?: {
    page?: number;
    page_size?: number;
    unit_id?: string;
  }): Promise<PaginatedResponse<ExpenseRecord>> => {
    const response = await apiClient.get<PaginatedResponse<ExpenseRecord>>(
      `/finance/expense?${toSearchParams(params)}`
    );
    return response.data;
  },

  getSummary: async (params?: {
    start_date?: string;
    end_date?: string;
    unit_id?: string;
  }): Promise<FinanceSummary> => {
    const now = new Date();
    const start = params?.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = params?.end_date ?? now.toISOString().split("T")[0];
    const searchParams = new URLSearchParams();
    searchParams.set("start_date", start);
    searchParams.set("end_date", end);
    if (params?.unit_id) searchParams.set("unit_id", params.unit_id);
    const response = await apiClient.get<FinanceSummary>(
      `/finance/summary?${searchParams.toString()}`
    );
    return response.data;
  },

  listAccounts: async (): Promise<Account[]> => {
    const response = await apiClient.get<Account[]>('/accounting/accounts');
    return response.data;
  },

  listJournalEntries: async (params?: {
    page?: number;
    page_size?: number;
    source?: JournalSource;
  }): Promise<PaginatedResponse<JournalEntry>> => {
    const response = await apiClient.get<PaginatedResponse<JournalEntry>>(
      `/accounting/journal-entries?${toSearchParams(params)}`
    );
    return response.data;
  },

  createJournalEntry: async (data: {
    entry_date: string;
    description: string;
    source?: JournalSource;
    lines: Array<{
      account_id: string;
      description?: string;
      debit?: number;
      credit?: number;
      unit_id?: string;
    }>;
  }): Promise<JournalEntry> => {
    const response = await apiClient.post<JournalEntry>('/accounting/journal-entries', data);
    return response.data;
  },

  getTrialBalance: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<TrialBalanceResponse> => {
    const now = new Date();
    const start = params?.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = params?.end_date ?? now.toISOString().split("T")[0];
    const response = await apiClient.get<TrialBalanceResponse>(
      `/accounting/trial-balance?${toSearchParams({ start_date: start, end_date: end })}`
    );
    return response.data;
  },

  listInvoices: async (params?: {
    page?: number;
    page_size?: number;
    recipient_type?: InvoiceRecipientType;
    status?: InvoiceStatus;
    unit_id?: string;
    customer_id?: string;
    owner_id?: string;
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get<PaginatedResponse<Invoice>>(
      `/invoices?${toSearchParams(params)}`
    );
    return response.data;
  },

  generateInvoiceFromBooking: async (bookingId: string, data: { issue_date?: string; due_date?: string } = {}): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/from-booking/${bookingId}`, data);
    return response.data;
  },

  addInvoicePayment: async (invoiceId: string, data: Partial<InvoicePayment>): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${invoiceId}/payments`, data);
    return response.data;
  },

  generateOwnerStatement: async (data: {
    owner_id: string;
    period_start: string;
    period_end: string;
    issue_date?: string;
    due_date?: string;
    notes?: string;
  }): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices/owner-statements', data);
    return response.data;
  },
};
