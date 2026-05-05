"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/customers";
import type { Customer } from "@/types";

export function useCustomers(filters: { page?: number; page_size?: number; is_blacklisted?: boolean } = {}) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: () => customersApi.list(filters),
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useBlacklistCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customersApi.blacklist(id, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useRemoveBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.removeBlacklist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
