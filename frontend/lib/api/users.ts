import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse, User, UserReference, UserRole } from "@/types";

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  role?: UserRole;
  phone?: string;
  is_active?: boolean;
}

export const usersApi = {
  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>(
      `/users?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  },

  create: async (data: CreateUserPayload): Promise<User> => {
    const response = await apiClient.post<User>("/users", data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserPayload): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string, is_active: boolean): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}`, { is_active });
    return response.data;
  },

  listAssignmentCandidates: async (): Promise<UserReference[]> => {
    const response = await apiClient.get<UserReference[]>("/users/assignment-candidates");
    return response.data;
  },
};