/**
 * Hooks React Query — pro-analytics (Phase 14).
 */

import { useQuery } from '@tanstack/react-query'
import { proAnalyticsApi } from '@/api/pro-analytics'

export const PRO_ANALYTICS_KEY = ['pro-analytics'] as const

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'overview'] as const,
    queryFn: () => proAnalyticsApi.overview(),
    staleTime: 60_000,
  })
}

export function useAnalyticsAides() {
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'aides'] as const,
    queryFn: () => proAnalyticsApi.aides(),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsLetters() {
  // Phase 14.1 : utilise le taux FX live (USD→EUR) pour cost monitoring exact
  const { data: fx } = useUsdEurRate()
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'letters', fx?.rate ?? 0.92] as const,
    queryFn: () => proAnalyticsApi.letters(fx?.rate ?? 0.92),
    staleTime: 60_000,
    enabled: true,
  })
}

export function useAnalyticsTopProspects(limit = 10) {
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'top', limit] as const,
    queryFn: () => proAnalyticsApi.topProspects(limit),
    staleTime: 60_000,
  })
}

/** Phase 14.1 — Taux USD/EUR live (ECB, cache 24h serveur + 1h client). */
export function useUsdEurRate() {
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'fx', 'USD-EUR'] as const,
    queryFn: () => proAnalyticsApi.fetchUsdEurRate(),
    staleTime: 60 * 60_000,
  })
}
