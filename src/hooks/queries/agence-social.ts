import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agenceSocialApi, type SocialPostInsert } from '@/api/agence-social'

export const SOCIAL_KEY = ['agence-social'] as const

export function useMySocialPosts(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...SOCIAL_KEY, 'list', agenceId] as const,
    queryFn: () => agenceSocialApi.list(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useMonthlyValidatedCount(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...SOCIAL_KEY, 'count-month', agenceId] as const,
    queryFn: () => agenceSocialApi.monthlyValidatedCount(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useCreateSocialPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SocialPostInsert) => agenceSocialApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SOCIAL_KEY }),
  })
}
