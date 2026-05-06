import { useQuery } from '@tanstack/react-query'
import { agenceReferralsApi } from '@/api/agence-referrals'

export const REFERRALS_KEY = ['agence-referrals'] as const

export function useMyReferralCommissions(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...REFERRALS_KEY, 'commissions', agenceId] as const,
    queryFn: () => agenceReferralsApi.listMyCommissions(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useMyReferred(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...REFERRALS_KEY, 'referred', agenceId] as const,
    queryFn: () => agenceReferralsApi.listMyReferred(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

/** Phase 16.1 Step C — arbre 5 niveaux des filleuls. */
export function useMyReferralTree() {
  return useQuery({
    queryKey: [...REFERRALS_KEY, 'tree'] as const,
    queryFn: () => agenceReferralsApi.getMyReferralTree(),
    staleTime: 60_000,
  })
}
