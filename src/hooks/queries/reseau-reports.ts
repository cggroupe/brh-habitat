/**
 * Phase 18.6 — Hooks React Query pour signalements modération.
 */
import { useMutation } from '@tanstack/react-query'
import { reseauReportsApi, type ReportReason } from '@/api/reseau-reports'

export function useReportPost() {
  return useMutation({
    mutationFn: (params: { postId: string; reason: ReportReason; comment?: string }) =>
      reseauReportsApi.reportPost(params),
  })
}

export function useReportComment() {
  return useMutation({
    mutationFn: (params: { commentId: string; reason: ReportReason; comment?: string }) =>
      reseauReportsApi.reportComment(params),
  })
}
