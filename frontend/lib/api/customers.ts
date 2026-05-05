import { apiClient } from "@/lib/api/client";
import type { Customer, PaginatedResponse } from "@/types";

export const customersApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    is_blacklisted?: boolean;
  }): Promise<PaginatedResponse<Customer>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size) searchParams.set("page_size", String(params.page_size));
    if (params?.is_blacklisted !== undefined)
      searchParams.set("is_blacklisted", String(params.is_blacklisted));
    const response = await apiClient.get<PaginatedResponse<Customer>>(
      `/customers?${searchParams.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  create: async (data: Partial<Customer>): Promise<Customer> => {
    const response = await apiClient.post<Customer>("/customers", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  blacklist: async (id: string, data: { reason: string }): Promise<Customer> => {
    const response = await apiClient.post<Customer>(`/customers/${id}/blacklist`, data);
    return response.data;
  },

  removeBlacklist: async (id: string): Promise<Customer> => {
    const response = await apiClient.delete<Customer>(`/customers/${id}/blacklist`);
    return response.data;
  },
};
