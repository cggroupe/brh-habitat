/**
 * Phase 16.0.5 — Hooks React Query Lead Assignments.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  leadAssignmentsApi,
  type ListAssignmentsFilters,
  type ContactOutcome,
} from '@/api/lead-assignments'

export const LEAD_ASSIGNMENTS_KEY = ['lead-assignments'] as const

export function useLeadAssignments(filters: ListAssignmentsFilters = {}) {
  return useQuery({
    queryKey: [...LEAD_ASSIGNMENTS_KEY, 'list', filters] as const,
    queryFn: () => leadAssignmentsApi.list(filters),
    staleTime: 60_000,
  })
}

export function useActiveCountForAgence(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...LEAD_ASSIGNMENTS_KEY, 'count-active', agenceId] as const,
    queryFn: () => leadAssignmentsApi.countActiveForAgence(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useClaimLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ prospectId, agenceId }: { prospectId: number; agenceId: string }) =>
      leadAssignmentsApi.claim(prospectId, agenceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_ASSIGNMENTS_KEY }),
  })
}

export function useLogAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      outcome,
      notes,
    }: {
      id: string
      outcome: ContactOutcome
      notes?: string
    }) => leadAssignmentsApi.logAttempt(id, outcome, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_ASSIGNMENTS_KEY }),
  })
}

export function useReleaseLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leadAssignmentsApi.release(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_ASSIGNMENTS_KEY }),
  })
}

export function useReleaseExpired() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadAssignmentsApi.releaseExpired(),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_ASSIGNMENTS_KEY }),
  })
}
