/**
 * Phase 18.6 — Hooks React Query pour tracking impressions feed.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { reseauImpressionsApi, type ImpressionEventType } from '@/api/reseau-impressions'

export const RESEAU_IMPRESSIONS_KEY = ['reseau-impressions'] as const

export function useMyViewedPostIds(limit = 200) {
  return useQuery({
    queryKey: [...RESEAU_IMPRESSIONS_KEY, 'viewed', limit] as const,
    queryFn: () => reseauImpressionsApi.myViewedPostIds(limit),
    staleTime: 5 * 60_000, // 5 min — ces données ne changent pas vite
  })
}

export function useTrackImpression() {
  return useMutation({
    mutationFn: (params: {
      postId: string
      eventType: ImpressionEventType
      dwellMs?: number
      sessionId?: string
    }) => reseauImpressionsApi.track(params),
    // Pas d'invalidate : impressions sont fire-and-forget côté UI
  })
}
