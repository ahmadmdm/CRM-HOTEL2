import { apiClient } from "@/lib/api/client";
import type { Unit, UnitSummary, PaginatedResponse } from "@/types";

export interface UnitFilters {
  page?: number;
  page_size?: number;
  status?: string;
}

export const unitsApi = {
  list: async (filters: UnitFilters = {}): Promise<PaginatedResponse<UnitSummary>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    if (filters.status) params.set("status", filters.status);
    const response = await apiClient.get<PaginatedResponse<UnitSummary>>(
      `/units?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<Unit> => {
    const response = await apiClient.get<Unit>(`/units/${id}`);
    return response.data;
  },

  create: async (data: Partial<Unit>): Promise<Unit> => {
    const response = await apiClient.post<Unit>("/units", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Unit>): Promise<Unit> => {
    const response = await apiClient.patch<Unit>(`/units/${id}`, data);
    return response.data;
  },

  changeStatus: async (
    id: string,
    status: string,
    reason?: string
  ): Promise<Unit> => {
    const response = await apiClient.patch<Unit>(`/units/${id}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  getStatusSummary: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get<Record<string, number>>(
      "/units/status-summary"
    );
    return response.data;
  },

  uploadImage: async (id: string, file: File): Promise<Unit> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<Unit>(
      `/units/${id}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/units/${id}`);
  },
};
