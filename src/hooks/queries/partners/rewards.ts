import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchRewardsCatalog,
  createReward,
  updateReward,
  fetchMyClaims,
  createRewardClaim,
  fetchAllClaims,
  updateClaimStatus,
} from '@/api/rewards'
import type { RewardInsert, RewardUpdate as RewardUpdateType } from '@/api/rewards'
import type { RewardClaimStatus } from '@/types/partner'

// ===========================================================================
// REWARDS
// ===========================================================================

export function useRewardsCatalog(activeOnly = true) {
  return useQuery({
    queryKey: ['rewards', 'catalog', activeOnly],
    queryFn: () => fetchRewardsCatalog(activeOnly),
    staleTime: 5 * 60_000,
  })
}

export function useCreateReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RewardInsert) => createReward(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
    onError: (err) => logError('useCreateReward', err),
  })
}

export function useUpdateReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RewardUpdateType }) =>
      updateReward(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
    onError: (err) => logError('useUpdateReward', err),
  })
}

export function useMyClaims(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['rewards', 'claims', affiliateId],
    queryFn: () => fetchMyClaims(affiliateId!),
    enabled: !!affiliateId,
    staleTime: 5 * 60_000,
  })
}

export function useCreateRewardClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      affiliateId,
      rewardId,
      pointsSpent,
      shippingAddress,
    }: {
      affiliateId: string
      rewardId: string
      pointsSpent: number
      shippingAddress?: string
    }) => createRewardClaim(affiliateId, rewardId, pointsSpent, shippingAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['points'] })
    },
    onError: (err) => logError('useCreateRewardClaim', err),
  })
}

export function useAdminClaims() {
  return useQuery({
    queryKey: ['rewards', 'claims', 'admin'],
    staleTime: 2 * 60_000,
    queryFn: fetchAllClaims,
  })
}

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: RewardClaimStatus; adminNotes?: string }) =>
      updateClaimStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    },
    onError: (err) => logError('useUpdateClaimStatus', err),
  })
}
