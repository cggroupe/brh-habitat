import { useQuery } from '@tanstack/react-query'
import {
  fetchMyAffiliate,
  fetchAllAffiliates,
  fetchAffiliateProspects,
  fetchPointsHistory,
} from '@/api/affiliates'

// ===========================================================================
// AFFILIATES
// ===========================================================================

export function useMyAffiliate(userId: string | undefined) {
  return useQuery({
    queryKey: ['affiliates', 'my', userId],
    queryFn: () => fetchMyAffiliate(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useAdminAffiliates(page: number) {
  return useQuery({
    queryKey: ['affiliates', 'admin', page],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllAffiliates(page),
  })
}

export function useAffiliateProspects(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'affiliate', affiliateId],
    queryFn: () => fetchAffiliateProspects(affiliateId!),
    enabled: !!affiliateId,
    staleTime: 5 * 60_000,
  })
}

export function usePointsHistory(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['points', 'history', affiliateId],
    queryFn: () => fetchPointsHistory(affiliateId!),
    enabled: !!affiliateId,
    staleTime: 5 * 60_000,
  })
}
