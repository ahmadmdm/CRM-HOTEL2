import { apiClient } from "@/lib/api/client";
import type {
  RevenueRecord,
  ExpenseRecord,
  FinanceSummary,
  PaginatedResponse,
} from "@/types";

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
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    const response = await apiClient.get<PaginatedResponse<RevenueRecord>>(
      `/finance/revenue?${searchParams.toString()}`
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
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    const response = await apiClient.get<PaginatedResponse<ExpenseRecord>>(
      `/finance/expense?${searchParams.toString()}`
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
};
