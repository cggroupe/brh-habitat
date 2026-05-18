import { useQuery } from '@tanstack/react-query'
import { brhRechercheApi } from '@/api/brh-recherche'

export function useRechercheMulti(query: string | null | undefined) {
  const q = (query ?? '').trim()
  return useQuery({
    queryKey: ['brh', 'recherche-multi', q],
    queryFn: () => brhRechercheApi.multi(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}
