import { useQuery } from '@tanstack/react-query'
import { brhPartnerSearchApi, type PartnerAudience } from '@/api/brh-partner-search'

export function usePartnerSearch(audience: PartnerAudience | null, query: string, enabled = true) {
  return useQuery({
    queryKey: ['brh', 'partner-search', audience, query] as const,
    queryFn: () => brhPartnerSearchApi.search(audience as PartnerAudience, query),
    enabled: !!audience && enabled,
    staleTime: 30_000,
  })
}
