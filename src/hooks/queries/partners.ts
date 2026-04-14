import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'

// Companies
import {
  fetchMyCompany,
  fetchCompanyById,
  fetchAllCompanies,
  updateCompany,
  fetchCompanyDashboardStats,
} from '@/api/companies'
import type { CompanyUpdate } from '@/api/companies'

// Prospects
import {
  fetchCompanyProspects,
  fetchAllProspects,
  fetchProspectById,
  createProspect,
  updateProspect,
  deleteProspect,
  fetchCompanyProspectStats,
} from '@/api/prospects'
import type { ProspectInsert, ProspectUpdate as ProspectUpdateType } from '@/api/prospects'

// Company Members
import {
  fetchCompanyMembers,
  inviteMember,
  removeMember,
} from '@/api/company-members'

// Quotes
import {
  fetchAllQuotes,
  createQuote,
  updateQuoteCommissionStatus,
} from '@/api/quotes'
import type { QuoteInsert } from '@/api/quotes'

// Affiliates
import {
  fetchMyAffiliate,
  fetchAllAffiliates,
  fetchAffiliateProspects,
  fetchPointsHistory,
} from '@/api/affiliates'

// Rewards
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

// Social Posts
import {
  fetchMySocialPosts,
  fetchAllSocialPosts,
  createSocialPost,
  updateSocialPostStatus,
  getMonthlyPostCount,
} from '@/api/social-posts'
import type { SocialPostInsert } from '@/api/social-posts'

// Recruitment
import { fetchMyRecruitTree, fetchNetworkStats, fetchMyRecruitmentCommissions } from '@/api/recruitment'

// Partner types
import type { ProspectStatus, CommissionStatus, RewardClaimStatus, SocialPostStatus } from '@/types/partner'

// ===========================================================================
// COMPANIES
// ===========================================================================

export function useMyCompany(userId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'my', userId],
    queryFn: () => fetchMyCompany(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useCompanyDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'detail', id],
    queryFn: () => fetchCompanyById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useAdminCompanies(page: number) {
  return useQuery({
    queryKey: ['companies', 'admin', page],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllCompanies(page),
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompanyUpdate }) =>
      updateCompany(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.setQueryData(['companies', 'detail', data.id], data)
    },
    onError: (err) => logError('useUpdateCompany', err),
  })
}

export function useCompanyDashboardStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'stats', companyId],
    queryFn: () => fetchCompanyDashboardStats(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })
}

// ===========================================================================
// PROSPECTS
// ===========================================================================

export function useCompanyProspects(companyId: string | undefined, page: number, status?: ProspectStatus) {
  return useQuery({
    queryKey: ['prospects', 'company', companyId, page, status],
    queryFn: () => fetchCompanyProspects(companyId!, page, status),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })
}

export function useAdminAllProspects(page: number, status?: ProspectStatus) {
  return useQuery({
    queryKey: ['prospects', 'admin', page, status],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllProspects(page, status),
  })
}

export function useProspectDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'detail', id],
    queryFn: () => fetchProspectById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useCreateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProspectInsert) => createProspect(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useCreateProspect', err),
  })
}

export function useUpdateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProspectUpdateType }) =>
      updateProspect(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.setQueryData(['prospects', 'detail', data.id], data)
    },
    onError: (err) => logError('useUpdateProspect', err),
  })
}

export function useDeleteProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProspect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useDeleteProspect', err),
  })
}

export function useCompanyProspectStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'stats', companyId],
    queryFn: () => fetchCompanyProspectStats(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })
}

// ===========================================================================
// COMPANY MEMBERS
// ===========================================================================

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-members', companyId],
    queryFn: () => fetchCompanyMembers(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, email }: { companyId: string; email: string }) =>
      inviteMember(companyId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] })
      queryClient.invalidateQueries({ queryKey: ['companies', 'stats'] })
    },
    onError: (err) => logError('useInviteMember', err),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] })
      queryClient.invalidateQueries({ queryKey: ['companies', 'stats'] })
    },
    onError: (err) => logError('useRemoveMember', err),
  })
}

// ===========================================================================
// QUOTES
// ===========================================================================

export function useAdminQuotes(page: number, commissionStatus?: CommissionStatus) {
  return useQuery({
    queryKey: ['quotes', 'admin', page, commissionStatus],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllQuotes(page, commissionStatus),
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuoteInsert) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['points'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useCreateQuote', err),
  })
}

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, paidAt }: { id: string; status: CommissionStatus; paidAt?: string | null }) =>
      updateQuoteCommissionStatus(id, status, paidAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useUpdateCommissionStatus', err),
  })
}

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

// ===========================================================================
// SOCIAL POSTS
// ===========================================================================

export function useMySocialPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['social-posts', 'my', userId],
    queryFn: () => fetchMySocialPosts(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useAdminSocialPosts(page: number, status?: SocialPostStatus) {
  return useQuery({
    queryKey: ['social-posts', 'admin', page, status],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllSocialPosts(page, status),
  })
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SocialPostInsert) => createSocialPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] })
    },
    onError: (err) => logError('useCreateSocialPost', err),
  })
}

export function useUpdateSocialPostStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
      adminNotes,
    }: {
      id: string
      status: SocialPostStatus
      rejectionReason?: string | null
      adminNotes?: string | null
    }) => updateSocialPostStatus(id, status, rejectionReason, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['points'] })
    },
    onError: (err) => logError('useUpdateSocialPostStatus', err),
  })
}

export function useMonthlyPostCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['social-posts', 'monthly-count', userId],
    queryFn: () => getMonthlyPostCount(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

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
