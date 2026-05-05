"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi, type BookingFilters, type CreateBookingData } from "@/lib/api/bookings";
import { toast } from "@/components/ui/toaster";

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
  ) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "حدث خطأ غير متوقع";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string"
  ) {
    return (error as { message?: string }).message ?? "حدث خطأ غير متوقع";
  }

  return "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters: BookingFilters) => [...bookingKeys.lists(), filters] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => bookingsApi.list(filters),
    staleTime: 30 * 1000,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingData) => bookingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.lists() });
      toast({ title: "تم إنشاء الحجز", description: "أُضيف الحجز الجديد بنجاح." });
    },
    onError: (error) => {
      toast({
        title: "تعذر إنشاء الحجز",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.checkIn(id, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast({ title: "تم تسجيل الدخول", description: "تم تحديث حالة الحجز بنجاح." });
    },
    onError: (error) => {
      toast({
        title: "تعذر تسجيل الدخول",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.checkOut(id, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast({ title: "تم تسجيل الخروج", description: "أُغلقت إقامة العميل وتم تحديث الحالة." });
    },
    onError: (error) => {
      toast({
        title: "تعذر تسجيل الخروج",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast({ title: "تم إلغاء الحجز", description: "جرت مزامنة حالة الحجز مع النظام." });
    },
    onError: (error) => {
      toast({
        title: "تعذر إلغاء الحجز",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
