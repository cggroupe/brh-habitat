/**
 * Hooks React Query — pro-subscription (Phase 15).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { proSubscriptionApi } from '@/api/pro-subscription'

export const PRO_SUB_KEY = ['pro-subscription'] as const

export function useMyProSubscription() {
  return useQuery({
    queryKey: [...PRO_SUB_KEY, 'mine'] as const,
    queryFn: () => proSubscriptionApi.getMine(),
    staleTime: 30_000,
  })
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (tier: 'pro' | 'expert') => proSubscriptionApi.createCheckoutSession(tier),
  })
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => proSubscriptionApi.createPortalSession(),
  })
}

/** Invalide le sub courant (à appeler après retour Stripe Checkout). */
export function useRefreshSubscription() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: PRO_SUB_KEY })
}
