import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse, Team, TeamType, UnitTeamAssignment } from "@/types";

export interface TeamFilters {
  page?: number;
  page_size?: number;
  team_type?: TeamType;
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

export const teamsApi = {
  list: async (filters: TeamFilters = {}): Promise<PaginatedResponse<Team>> => {
    const response = await apiClient.get<PaginatedResponse<Team>>(`/teams?${toSearchParams(filters)}`);
    return response.data;
  },
  create: async (data: Partial<Team> & { member_ids?: string[] }): Promise<Team> => {
    const response = await apiClient.post<Team>("/teams", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Team> & { member_ids?: string[] }): Promise<Team> => {
    const response = await apiClient.patch<Team>(`/teams/${id}`, data);
    return response.data;
  },
  assignToUnit: async (data: Partial<UnitTeamAssignment>): Promise<UnitTeamAssignment> => {
    const response = await apiClient.post<UnitTeamAssignment>("/teams/assignments", data);
    return response.data;
  },
};