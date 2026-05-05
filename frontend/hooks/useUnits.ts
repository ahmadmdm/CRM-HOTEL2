"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitsApi, type UnitFilters } from "@/lib/api/units";
import type { Unit } from "@/types";

export const unitKeys = {
  all: ["units"] as const,
  lists: () => [...unitKeys.all, "list"] as const,
  list: (filters: UnitFilters) => [...unitKeys.lists(), filters] as const,
  details: () => [...unitKeys.all, "detail"] as const,
  detail: (id: string) => [...unitKeys.details(), id] as const,
  statusSummary: () => [...unitKeys.all, "status-summary"] as const,
};

export function useUnits(filters: UnitFilters = {}) {
  return useQuery({
    queryKey: unitKeys.list(filters),
    queryFn: () => unitsApi.list(filters),
    staleTime: 30 * 1000,
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: unitKeys.detail(id),
    queryFn: () => unitsApi.getById(id),
    enabled: !!id,
  });
}

export function useUnitStatusSummary() {
  return useQuery({
    queryKey: unitKeys.statusSummary(),
    queryFn: unitsApi.getStatusSummary,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Unit>) => unitsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: unitKeys.lists() }),
  });
}

export function useUpdateUnit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Unit>) => unitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitKeys.detail(id) });
      qc.invalidateQueries({ queryKey: unitKeys.lists() });
    },
  });
}

export function useChangeUnitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => unitsApi.changeStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}
