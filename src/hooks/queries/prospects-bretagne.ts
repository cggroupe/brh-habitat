/**
 * Hooks React Query — prospects-bretagne (Phase 11.2).
 *
 * Pair volontaire avec src/api/prospects-bretagne.ts.
 */

import { useQuery } from '@tanstack/react-query'
import {
  prospectsBretagneApi,
  type ListProspectsFilters,
} from '@/api/prospects-bretagne'

export const PROSPECTS_BZH_KEY = ['prospects-bretagne'] as const

export function useProspectsBretagne(filters: ListProspectsFilters) {
  return useQuery({
    queryKey: [...PROSPECTS_BZH_KEY, filters] as const,
    queryFn: () => prospectsBretagneApi.list(filters),
    staleTime: 60_000,
  })
}

export function useProspectBretagneDetail(id: number | undefined) {
  return useQuery({
    queryKey: [...PROSPECTS_BZH_KEY, 'detail', id] as const,
    queryFn: () => prospectsBretagneApi.detail(id!),
    enabled: !!id,
  })
}

export function useProspectsBretagneCounts(opts: { departement?: '22' | '29' | '35' | '56' | null }) {
  return useQuery({
    queryKey: [...PROSPECTS_BZH_KEY, 'counts', opts] as const,
    queryFn: () => prospectsBretagneApi.countBySegment(opts),
    staleTime: 60_000,
  })
}
