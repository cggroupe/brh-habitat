import { useQuery } from '@tanstack/react-query'
import { brhClientsHistoriqueApi, type ClientsBrhFilters } from '@/api/brh-clients-historique'

export function useClientsBrh(filters: ClientsBrhFilters = {}) {
  return useQuery({
    queryKey: ['brh', 'clients-historique', filters],
    queryFn: () => brhClientsHistoriqueApi.search(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
