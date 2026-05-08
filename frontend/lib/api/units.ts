import { apiClient } from "@/lib/api/client";
import type { Unit, UnitSummary, PaginatedResponse } from "@/types";

export interface UnitFilters {
  page?: number;
  page_size?: number;
  status?: string;
  location_id?: string;
  owner_id?: string;
  management_entity_id?: string;
  property_group_id?: string;
  team_id?: string;
  is_managed_by_us?: boolean;
}

export const unitsApi = {
  list: async (filters: UnitFilters = {}): Promise<PaginatedResponse<UnitSummary>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    if (filters.status) params.set("status", filters.status);
    if (filters.location_id) params.set("location_id", filters.location_id);
    if (filters.owner_id) params.set("owner_id", filters.owner_id);
    if (filters.management_entity_id) params.set("management_entity_id", filters.management_entity_id);
    if (filters.property_group_id) params.set("property_group_id", filters.property_group_id);
    if (filters.team_id) params.set("team_id", filters.team_id);
    if (filters.is_managed_by_us !== undefined) params.set("is_managed_by_us", String(filters.is_managed_by_us));
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
