import { useQuery } from '@tanstack/react-query'
import { brhFichesPagedApi, type PagedDpeFilters } from '@/api/brh-fiches-paged'

export function usePagedDpeBySiren(siren: string | null, filters: PagedDpeFilters) {
  return useQuery({
    queryKey: ['brh-fiches-paged', siren, filters],
    queryFn: () => brhFichesPagedApi.getDpeBySiren(siren as string, filters),
    enabled: !!siren,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

export function useDpeSummary(siren: string | null) {
  return useQuery({
    queryKey: ['brh-dpe-summary', siren],
    queryFn: () => brhFichesPagedApi.getDpeSummary(siren as string),
    enabled: !!siren,
    staleTime: 5 * 60 * 1000,
  })
}
