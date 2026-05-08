import { apiClient } from "@/lib/api/client";
import type { LocationKind, PaginatedResponse, UnitLocation } from "@/types";

export interface LocationFilters {
  page?: number;
  page_size?: number;
  kind?: LocationKind;
  parent_id?: string;
}

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

export const locationsApi = {
  list: async (filters: LocationFilters = {}): Promise<PaginatedResponse<UnitLocation>> => {
    const response = await apiClient.get<PaginatedResponse<UnitLocation>>(
      `/locations?${toSearchParams(filters)}`
    );
    return response.data;
  },

  create: async (data: Partial<UnitLocation>): Promise<UnitLocation> => {
    const response = await apiClient.post<UnitLocation>("/locations", data);
    return response.data;
  },

  update: async (id: string, data: Partial<UnitLocation>): Promise<UnitLocation> => {
    const response = await apiClient.patch<UnitLocation>(`/locations/${id}`, data);
    return response.data;
  },
};