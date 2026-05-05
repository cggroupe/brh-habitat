import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agenceContributionsApi,
  type ContributionInsert,
} from '@/api/agence-contributions'

export const AGENCE_CONTRIB_KEY = ['agence-contributions'] as const

export function useMyContributions(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...AGENCE_CONTRIB_KEY, 'list', agenceId] as const,
    queryFn: () => agenceContributionsApi.list(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useMyProgression(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...AGENCE_CONTRIB_KEY, 'progression', agenceId] as const,
    queryFn: () => agenceContributionsApi.myProgression(agenceId!),
    enabled: !!agenceId,
    staleTime: 30_000,
  })
}

export function useSubmitContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ContributionInsert) => agenceContributionsApi.submit(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCE_CONTRIB_KEY })
    },
  })
}
