import { apiClient } from "@/lib/api/client";
import type {
  ManagementEntity,
  Owner,
  PaginatedResponse,
  PropertyGroup,
  UnitManagementContract,
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

export const managementApi = {
  listOwners: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Owner>> => {
    const response = await apiClient.get<PaginatedResponse<Owner>>(`/management/owners?${toSearchParams(params)}`);
    return response.data;
  },
  createOwner: async (data: Partial<Owner>): Promise<Owner> => {
    const response = await apiClient.post<Owner>("/management/owners", data);
    return response.data;
  },
  updateOwner: async (id: string, data: Partial<Owner>): Promise<Owner> => {
    const response = await apiClient.patch<Owner>(`/management/owners/${id}`, data);
    return response.data;
  },

  listEntities: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<ManagementEntity>> => {
    const response = await apiClient.get<PaginatedResponse<ManagementEntity>>(`/management/entities?${toSearchParams(params)}`);
    return response.data;
  },
  createEntity: async (data: Partial<ManagementEntity>): Promise<ManagementEntity> => {
    const response = await apiClient.post<ManagementEntity>("/management/entities", data);
    return response.data;
  },
  updateEntity: async (id: string, data: Partial<ManagementEntity>): Promise<ManagementEntity> => {
    const response = await apiClient.patch<ManagementEntity>(`/management/entities/${id}`, data);
    return response.data;
  },

  listPropertyGroups: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<PropertyGroup>> => {
    const response = await apiClient.get<PaginatedResponse<PropertyGroup>>(`/management/property-groups?${toSearchParams(params)}`);
    return response.data;
  },
  createPropertyGroup: async (data: Partial<PropertyGroup>): Promise<PropertyGroup> => {
    const response = await apiClient.post<PropertyGroup>("/management/property-groups", data);
    return response.data;
  },
  updatePropertyGroup: async (id: string, data: Partial<PropertyGroup>): Promise<PropertyGroup> => {
    const response = await apiClient.patch<PropertyGroup>(`/management/property-groups/${id}`, data);
    return response.data;
  },

  listContracts: async (params?: { page?: number; page_size?: number; unit_id?: string }): Promise<PaginatedResponse<UnitManagementContract>> => {
    const response = await apiClient.get<PaginatedResponse<UnitManagementContract>>(`/management/contracts?${toSearchParams(params)}`);
    return response.data;
  },
  createContract: async (data: Partial<UnitManagementContract>): Promise<UnitManagementContract> => {
    const response = await apiClient.post<UnitManagementContract>("/management/contracts", data);
    return response.data;
  },
  updateContract: async (id: string, data: Partial<UnitManagementContract>): Promise<UnitManagementContract> => {
    const response = await apiClient.patch<UnitManagementContract>(`/management/contracts/${id}`, data);
    return response.data;
  },
};