import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import { saveChiffrage } from '@/api/chiffrages'

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
    onError: (err: Error) => logError(err),
  })
}
