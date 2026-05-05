import { apiClient } from "@/lib/api/client";
import type { LoginRequest, TokenResponse, User } from "@/types";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>("/auth/login", data);
    return response.data;
  },

  refresh: async (): Promise<{ access_token: string; token_type: string }> => {
    const response = await apiClient.post("/auth/refresh", {});
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout", {});
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};
