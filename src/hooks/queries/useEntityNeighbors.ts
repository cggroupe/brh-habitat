import { useQuery } from '@tanstack/react-query'
import { brhEntityNeighborsApi, type EntityType } from '@/api/brh-entity-neighbors'

export function useEntityNeighbors(type: EntityType | null, id: string | null) {
  return useQuery({
    queryKey: ['brh', 'entity-neighbors', type, id],
    queryFn: () => brhEntityNeighborsApi.get(type as EntityType, id as string),
    enabled: !!type && !!id,
    staleTime: 60_000,
  })
}
