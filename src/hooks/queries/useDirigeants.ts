import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brhDirigeantsApi, type DirigeantSearchFilters, type DirigeantEditPatch } from '@/api/brh-dirigeants'

export function useDirigeantsSearch(filters: DirigeantSearchFilters = {}) {
  return useQuery({
    queryKey: ['brh', 'dirigeants', filters],
    queryFn: () => brhDirigeantsApi.search(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useDirigeant360(id: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'dirigeant-360', id],
    queryFn: () => brhDirigeantsApi.get360(id as string),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useUpdateDirigeant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: DirigeantEditPatch) => brhDirigeantsApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'dirigeant-360', id] })
      qc.invalidateQueries({ queryKey: ['brh', 'dirigeants'] })
    },
  })
}
