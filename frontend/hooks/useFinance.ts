"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";

export function useFinanceSummary() {
  return useQuery({
    queryKey: ["finance-summary"],
    queryFn: () => financeApi.getSummary(),
    staleTime: 60_000,
  });
}

export function useRevenue(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["revenue", filters],
    queryFn: () => financeApi.listRevenue(filters),
    staleTime: 30_000,
  });
}

export function useExpenses(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => financeApi.listExpenses(filters),
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useCreateRevenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createRevenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useInvoices(filters: Parameters<typeof financeApi.listInvoices>[0] = {}) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => financeApi.listInvoices(filters),
    staleTime: 30_000,
  });
}

export function useJournalEntries(filters: Parameters<typeof financeApi.listJournalEntries>[0] = {}) {
  return useQuery({
    queryKey: ["journal-entries", filters],
    queryFn: () => financeApi.listJournalEntries(filters),
    staleTime: 30_000,
  });
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ["trial-balance"],
    queryFn: () => financeApi.getTrialBalance(),
    staleTime: 30_000,
  });
}
