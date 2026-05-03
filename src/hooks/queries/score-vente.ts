/**
 * Phase 16.0.3 — Hooks React Query Score Vente.
 */
import { useQuery } from '@tanstack/react-query'
import { scoreVenteApi, type ListScoreVenteFilters } from '@/api/score-vente'

export const SCORE_VENTE_KEY = ['score-vente'] as const

export function useScoreVenteList(filters: ListScoreVenteFilters = {}) {
  return useQuery({
    queryKey: [...SCORE_VENTE_KEY, 'list', filters] as const,
    queryFn: () => scoreVenteApi.list(filters),
    staleTime: 5 * 60_000,
  })
}

export function useScoreVenteStats() {
  return useQuery({
    queryKey: [...SCORE_VENTE_KEY, 'stats'] as const,
    queryFn: () => scoreVenteApi.stats(),
    staleTime: 5 * 60_000,
  })
}
