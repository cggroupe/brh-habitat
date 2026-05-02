/**
 * Hooks React Query — artisan-portal (Phase 13.6.4).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { artisanPortalApi, type LeadAction } from '@/api/artisan-portal'

export const ARTISAN_PORTAL_KEY = ['artisan-portal'] as const

export function useMyArtisan() {
  return useQuery({
    queryKey: [...ARTISAN_PORTAL_KEY, 'me'] as const,
    queryFn: () => artisanPortalApi.getMyArtisan(),
    staleTime: 60_000,
  })
}

export function useMyLeadsReceived() {
  return useQuery({
    queryKey: [...ARTISAN_PORTAL_KEY, 'leads'] as const,
    queryFn: () => artisanPortalApi.myLeadsReceived(),
    staleTime: 30_000,
  })
}

export function useRespondToLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      leadId: string
      action: LeadAction
      reason?: string
      actualChantierEur?: number
    }) => artisanPortalApi.respondToLead(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARTISAN_PORTAL_KEY })
    },
  })
}
