import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import { fetchMyChiffrages, saveChiffrage } from '@/api/chiffrages'

export function useMyChiffrages(userId: string | undefined) {
  return useQuery({
    queryKey: ['chiffrages', userId],
    queryFn: () => fetchMyChiffrages(userId!),
    enabled: !!userId,
    staleTime: 2 * 60_000,
  })
}

export function useSaveChiffrage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      chiffrage,
      userId,
      companyId,
    }: {
      chiffrage: Parameters<typeof saveChiffrage>[0]
      userId: string
      companyId?: string | null
    }) => saveChiffrage(chiffrage, userId, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chiffrages'] })
    },
    onError: (err: Error) => logError('saveChiffrage failed', err),
  })
}
