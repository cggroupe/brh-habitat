/**
 * 2026-05-17 — Hook React Query pour le RPC unifié (UnifiedLeadsView).
 */
import { useQuery } from '@tanstack/react-query'
import {
  foncierProspectsUnifiedApi,
  type FoncierUnifiedFilters,
} from '@/api/foncier-prospects-unified'

export const FONCIER_PROSPECTS_UNIFIED_KEY = ['foncier-prospects-unified'] as const

export function useFoncierProspectsUnified(filters: FoncierUnifiedFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [...FONCIER_PROSPECTS_UNIFIED_KEY, filters] as const,
    queryFn: () => foncierProspectsUnifiedApi.list(filters),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
