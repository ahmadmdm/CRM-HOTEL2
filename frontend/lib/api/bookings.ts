import { apiClient } from "@/lib/api/client";
import type { Booking, PaginatedResponse } from "@/types";

export interface BookingFilters {
  page?: number;
  page_size?: number;
  status?: string;
  unit_id?: string;
  customer_id?: string;
}

export interface CreateBookingData {
  unit_id: string;
  customer_id: string;
  check_in: string;
  check_out: string;
  total_cost: number;
  tax_amount?: number;
  deposit_amount?: number;
  booking_channel?: string;
  guests_count?: number;
  notes?: string;
}

export const bookingsApi = {
  list: async (filters: BookingFilters = {}): Promise<PaginatedResponse<Booking>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    const response = await apiClient.get<PaginatedResponse<Booking>>(
      `/bookings?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<Booking> => {
    const response = await apiClient.get<Booking>(`/bookings/${id}`);
    return response.data;
  },

  create: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post<Booking>("/bookings", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Booking>): Promise<Booking> => {
    const response = await apiClient.patch<Booking>(`/bookings/${id}`, data);
    return response.data;
  },

  checkIn: async (id: string, data?: { actual_check_in?: string; notes?: string }): Promise<Booking> => {
    const response = await apiClient.post<Booking>(`/bookings/${id}/check-in`, data ?? {});
    return response.data;
  },

  checkOut: async (id: string, data?: { actual_check_out?: string; notes?: string }): Promise<Booking> => {
    const response = await apiClient.post<Booking>(`/bookings/${id}/check-out`, data ?? {});
    return response.data;
  },

  cancel: async (id: string): Promise<Booking> => {
    const response = await apiClient.post<Booking>(`/bookings/${id}/cancel`);
    return response.data;
  },

  updatePayment: async (
    id: string,
    data: { amount_paid: number; payment_status: string }
  ): Promise<Booking> => {
    const response = await apiClient.patch<Booking>(`/bookings/${id}/payment`, data);
    return response.data;
  },
};
