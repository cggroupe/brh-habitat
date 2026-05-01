import { useQuery } from '@tanstack/react-query'
import { fetchMyRecruitTree, fetchNetworkStats, fetchMyRecruitmentCommissions } from '@/api/recruitment'

// ===========================================================================
// RECRUITMENT
// ===========================================================================

export function useMyRecruitTree(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'tree', recruiterId],
    queryFn: () => fetchMyRecruitTree(recruiterId!),
    enabled: !!recruiterId,
    staleTime: 5 * 60_000,
  })
}

export function useNetworkStats(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'stats', recruiterId],
    queryFn: () => fetchNetworkStats(recruiterId!),
    enabled: !!recruiterId,
    staleTime: 5 * 60_000,
  })
}

export function useMyRecruitmentCommissions(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'commissions', recruiterId],
    queryFn: () => fetchMyRecruitmentCommissions(recruiterId!),
    enabled: !!recruiterId,
    staleTime: 5 * 60_000,
  })
}
