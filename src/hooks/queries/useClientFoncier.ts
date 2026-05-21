import { useQuery } from '@tanstack/react-query'
import { brhClientFoncierApi } from '@/api/brh-client-foncier'

export function useClientFoncier(personneId: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'client-foncier', personneId],
    queryFn: () => brhClientFoncierApi.getFoncier(personneId as string),
    enabled: !!personneId,
    staleTime: 60_000,
  })
}
