import { apiClient } from "@/lib/api/client";
import type {
  CleaningTask,
  MaintenanceTicket,
  PaginatedResponse,
} from "@/types";

export const operationsApi = {
  // Cleaning Tasks
  createCleaningTask: async (
    data: Partial<CleaningTask>
  ): Promise<CleaningTask> => {
    const response = await apiClient.post<CleaningTask>(
      "/operations/cleaning",
      data
    );
    return response.data;
  },

  listCleaningTasks: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    unit_id?: string;
  }): Promise<PaginatedResponse<CleaningTask>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    const response = await apiClient.get<PaginatedResponse<CleaningTask>>(
      `/operations/cleaning?${searchParams.toString()}`
    );
    return response.data;
  },

  getMyCleaningTasks: async (): Promise<CleaningTask[]> => {
    const response = await apiClient.get<CleaningTask[]>(
      "/operations/cleaning/my-tasks"
    );
    return response.data;
  },

  updateCleaningStatus: async (
    id: string,
    data: { status: string; notes?: string }
  ): Promise<CleaningTask> => {
    const response = await apiClient.patch<CleaningTask>(
      `/operations/cleaning/${id}/status`,
      data
    );
    return response.data;
  },

  // Maintenance Tickets
  listMaintenanceTickets: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    unit_id?: string;
  }): Promise<PaginatedResponse<MaintenanceTicket>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    const response = await apiClient.get<PaginatedResponse<MaintenanceTicket>>(
      `/operations/maintenance?${searchParams.toString()}`
    );
    return response.data;
  },

  createMaintenanceTicket: async (
    data: Partial<MaintenanceTicket>
  ): Promise<MaintenanceTicket> => {
    const response = await apiClient.post<MaintenanceTicket>(
      "/operations/maintenance",
      data
    );
    return response.data;
  },

  updateMaintenanceStatus: async (
    id: string,
    data: { status: string; resolution_notes?: string }
  ): Promise<MaintenanceTicket> => {
    const response = await apiClient.patch<MaintenanceTicket>(
      `/operations/maintenance/${id}/status`,
      data
    );
    return response.data;
  },
};
