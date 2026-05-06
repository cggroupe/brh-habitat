/**
 * Phase 18.11 — Hooks React Query pour découverte pros.
 */
import { useQuery } from '@tanstack/react-query'
import { reseauDiscoverApi, type DiscoverFilters } from '@/api/reseau-discover'

export const RESEAU_DISCOVER_KEY = ['reseau-discover'] as const

export function useDiscoverPros(filters: DiscoverFilters = {}) {
  return useQuery({
    queryKey: [...RESEAU_DISCOVER_KEY, 'search', filters] as const,
    queryFn: () => reseauDiscoverApi.search(filters),
    staleTime: 5 * 60_000,
  })
}
