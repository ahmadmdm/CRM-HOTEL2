"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsApi } from "@/lib/api/operations";

export function useCleaningTasks(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["cleaning-tasks", filters],
    queryFn: () => operationsApi.listCleaningTasks(filters),
    staleTime: 30_000,
  });
}

export function useMyCleaningTasks() {
  return useQuery({
    queryKey: ["my-cleaning-tasks"],
    queryFn: operationsApi.getMyCleaningTasks,
    refetchInterval: 30_000,
  });
}

export function useMaintenanceTickets(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["maintenance-tickets", filters],
    queryFn: () => operationsApi.listMaintenanceTickets(filters),
    staleTime: 30_000,
  });
}

export function useUpdateCleaningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      operationsApi.updateCleaningStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cleaning-tasks"] });
      qc.invalidateQueries({ queryKey: ["my-cleaning-tasks"] });
    },
  });
}

export function useCreateMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: operationsApi.createMaintenanceTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance-tickets"] }),
  });
}

export function useUpdateMaintenanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      operationsApi.updateMaintenanceStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance-tickets"] }),
  });
}
