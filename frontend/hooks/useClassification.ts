"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { locationsApi, type LocationFilters } from "@/lib/api/locations";
import { managementApi } from "@/lib/api/management";
import { teamsApi, type TeamFilters } from "@/lib/api/teams";

export const classificationKeys = {
  locations: (filters: LocationFilters = {}) => ["locations", filters] as const,
  owners: (filters: { page?: number; page_size?: number } = {}) => ["owners", filters] as const,
  managementEntities: (filters: { page?: number; page_size?: number } = {}) => ["management-entities", filters] as const,
  propertyGroups: (filters: { page?: number; page_size?: number } = {}) => ["property-groups", filters] as const,
  contracts: (filters: { page?: number; page_size?: number; unit_id?: string } = {}) => ["management-contracts", filters] as const,
  teams: (filters: TeamFilters = {}) => ["teams", filters] as const,
};

export function useLocations(filters: LocationFilters = {}) {
  return useQuery({ queryKey: classificationKeys.locations(filters), queryFn: () => locationsApi.list(filters), staleTime: 60_000 });
}

export function useOwners(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({ queryKey: classificationKeys.owners(filters), queryFn: () => managementApi.listOwners(filters), staleTime: 60_000 });
}

export function useManagementEntities(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({ queryKey: classificationKeys.managementEntities(filters), queryFn: () => managementApi.listEntities(filters), staleTime: 60_000 });
}

export function usePropertyGroups(filters: { page?: number; page_size?: number } = {}) {
  return useQuery({ queryKey: classificationKeys.propertyGroups(filters), queryFn: () => managementApi.listPropertyGroups(filters), staleTime: 60_000 });
}

export function useManagementContracts(filters: { page?: number; page_size?: number; unit_id?: string } = {}) {
  return useQuery({ queryKey: classificationKeys.contracts(filters), queryFn: () => managementApi.listContracts(filters), staleTime: 30_000 });
}

export function useTeams(filters: TeamFilters = {}) {
  return useQuery({ queryKey: classificationKeys.teams(filters), queryFn: () => teamsApi.list(filters), staleTime: 60_000 });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: locationsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }) });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: managementApi.createOwner, onSuccess: () => qc.invalidateQueries({ queryKey: ["owners"] }) });
}

export function useCreateManagementEntity() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: managementApi.createEntity, onSuccess: () => qc.invalidateQueries({ queryKey: ["management-entities"] }) });
}

export function useCreatePropertyGroup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: managementApi.createPropertyGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ["property-groups"] }) });
}

export function useCreateManagementContract() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: managementApi.createContract, onSuccess: () => qc.invalidateQueries({ queryKey: ["management-contracts"] }) });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: teamsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
}

export function useAssignTeamToUnit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: teamsApi.assignToUnit, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
}