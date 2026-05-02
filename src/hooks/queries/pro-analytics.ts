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
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'letters'] as const,
    queryFn: () => proAnalyticsApi.letters(),
    staleTime: 60_000,
  })
}

export function useAnalyticsTopProspects(limit = 10) {
  return useQuery({
    queryKey: [...PRO_ANALYTICS_KEY, 'top', limit] as const,
    queryFn: () => proAnalyticsApi.topProspects(limit),
    staleTime: 60_000,
  })
}
