import { useQuery } from '@tanstack/react-query'
import { brhPersonne360Api } from '@/api/brh-personne-360'

export function usePersonne360(personneId: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'personne-360', personneId],
    queryFn: () => brhPersonne360Api.get(personneId as string),
    enabled: !!personneId,
    staleTime: 60_000,
  })
}
