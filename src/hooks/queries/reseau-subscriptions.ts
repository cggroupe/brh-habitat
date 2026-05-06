/**
 * Phase 18.12 — Hooks React Query pour abonnements Pro Premium réseau.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { reseauSubscriptionsApi } from '@/api/reseau-subscriptions'

export const RESEAU_SUBSCRIPTIONS_KEY = ['reseau-subscriptions'] as const

export function useMyReseauSubscription() {
  return useQuery({
    queryKey: [...RESEAU_SUBSCRIPTIONS_KEY, 'mine'] as const,
    queryFn: () => reseauSubscriptionsApi.getMy(),
    staleTime: 5 * 60_000,
  })
}

export function useCreateReseauCheckout() {
  return useMutation({
    mutationFn: (targetTier: 'premium' | 'featured') =>
      reseauSubscriptionsApi.createCheckoutSession(targetTier),
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url
    },
  })
}

export function useOpenReseauPortal() {
  return useMutation({
    mutationFn: () => reseauSubscriptionsApi.cancelAtPeriodEnd(),
  })
}
