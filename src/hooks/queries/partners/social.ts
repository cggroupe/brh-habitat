import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchMySocialPosts,
  fetchAllSocialPosts,
  createSocialPost,
  updateSocialPostStatus,
  getMonthlyPostCount,
} from '@/api/social-posts'
import type { SocialPostInsert } from '@/api/social-posts'
import type { SocialPostStatus } from '@/types/partner'

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
