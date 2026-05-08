/**
 * Phase 11.4 — Hooks tanstack pour le tableau Foncier Prospects.
 */
import { useQuery } from '@tanstack/react-query'
import { foncierProspectsTableApi, type FoncierTableFilters } from '@/api/foncier-prospects-table'

export const FONCIER_PROSPECTS_TABLE_KEY = ['foncier-prospects-table'] as const

export function useFoncierProspectsTable(filters: FoncierTableFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [...FONCIER_PROSPECTS_TABLE_KEY, filters] as const,
    queryFn: () => foncierProspectsTableApi.list(filters),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
