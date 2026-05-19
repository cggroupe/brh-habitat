import { useQuery } from '@tanstack/react-query'
import { brhPersonneSignalsApi } from '@/api/brh-personne-signals'

export function usePersonneSignals(personneId: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'personne-signals', personneId],
    queryFn: () => brhPersonneSignalsApi.get(personneId as string),
    enabled: !!personneId,
    staleTime: 60_000,
  })
}
