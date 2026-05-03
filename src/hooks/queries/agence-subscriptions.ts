/**
 * Phase 16.0.8 — Hooks abonnements agences.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agenceSubscriptionsApi,
  type AgenceTier,
} from '@/api/agence-subscriptions'

export const AGENCE_SUBS_KEY = ['agence-subscriptions'] as const

export function useMyAgenceSubscription() {
  return useQuery({
    queryKey: [...AGENCE_SUBS_KEY, 'mine'] as const,
    queryFn: () => agenceSubscriptionsApi.getMine(),
    staleTime: 60_000,
  })
}

export function useAgenceSubscription(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...AGENCE_SUBS_KEY, 'by-agence', agenceId] as const,
    queryFn: () => agenceSubscriptionsApi.getByAgenceId(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useCreateAgenceSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { agenceId: string; signerProfileId: string; tier: AgenceTier }) =>
      agenceSubscriptionsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCE_SUBS_KEY })
    },
  })
}

export function useClaimLeadAtomic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ prospectId, agenceId }: { prospectId: number; agenceId: string }) =>
      agenceSubscriptionsApi.claimLead(prospectId, agenceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCE_SUBS_KEY })
      qc.invalidateQueries({ queryKey: ['lead-assignments'] })
    },
  })
}
