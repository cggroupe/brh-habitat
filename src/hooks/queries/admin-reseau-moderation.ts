/**
 * Phase 18.9 — Hooks React Query pour modération admin réseau social.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminReseauModerationApi,
  type ReportStatus,
  type ModerationAction,
} from '@/api/admin-reseau-moderation'
import { RESEAU_POSTS_KEY } from '@/hooks/queries/reseau-posts'

export const ADMIN_RESEAU_MODERATION_KEY = ['admin-reseau-moderation'] as const

export function useAdminReports(status: ReportStatus | 'all' = 'pending') {
  return useQuery({
    queryKey: [...ADMIN_RESEAU_MODERATION_KEY, 'list', status] as const,
    queryFn: () => adminReseauModerationApi.listReports(status),
    staleTime: 30_000,
  })
}

export function useAdminPendingReportsCount() {
  return useQuery({
    queryKey: [...ADMIN_RESEAU_MODERATION_KEY, 'count-pending'] as const,
    queryFn: () => adminReseauModerationApi.countPending(),
    staleTime: 30_000,
  })
}

export function useDismissReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reportId: string) => adminReseauModerationApi.dismissReport(reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_RESEAU_MODERATION_KEY }),
  })
}

export function useResolveReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: ModerationAction }) =>
      adminReseauModerationApi.resolveReport(reportId, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_RESEAU_MODERATION_KEY }),
  })
}

export function useHidePostAndResolve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { reportId: string; postId: string; reason: string }) =>
      adminReseauModerationApi.hidePostAndResolve(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_RESEAU_MODERATION_KEY })
      qc.invalidateQueries({ queryKey: RESEAU_POSTS_KEY })
    },
  })
}

export function useUnhidePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => adminReseauModerationApi.unhidePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_RESEAU_MODERATION_KEY })
      qc.invalidateQueries({ queryKey: RESEAU_POSTS_KEY })
    },
  })
}

export function useHideCommentAndResolve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { reportId: string; commentId: string; reason: string }) =>
      adminReseauModerationApi.hideCommentAndResolve(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_RESEAU_MODERATION_KEY }),
  })
}
