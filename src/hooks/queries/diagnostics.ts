import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchUserDiagnostics,
  fetchDiagnostics,
  fetchDiagnosticById,
  createDiagnostic,
  updateDiagnosticStatus,
  fetchUserDraftDiagnostic,
  fetchUserCompletedDiagnostics,
  upsertDraftDiagnostic,
  deleteDiagnostic,
} from '@/api/diagnostics'
import type { DiagnosticStatus } from '@/types/database'
import type { Database } from '@/types/database'

type DiagnosticInsert = Database['public']['Tables']['brh_diagnostics']['Insert']
type DiagnosticUpdate = Database['public']['Tables']['brh_diagnostics']['Update']

export function useUserDiagnostics(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'user', userId],
    queryFn: () => fetchUserDiagnostics(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useDiagnosticDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'detail', id],
    queryFn: () => fetchDiagnosticById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useAdminDiagnostics(page: number, status?: DiagnosticStatus) {
  return useQuery({
    queryKey: ['diagnostics', 'admin', page, status],
    staleTime: 2 * 60_000,
    queryFn: () => fetchDiagnostics(page, status),
  })
}

export function useCreateDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DiagnosticInsert) => createDiagnostic(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useCreateDiagnostic', err),
  })
}

export function useUserDraftDiagnostic(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'draft', userId],
    queryFn: () => fetchUserDraftDiagnostic(userId!),
    enabled: !!userId,
  })
}

export function useUserCompletedDiagnostics(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'completed', userId],
    queryFn: () => fetchUserCompletedDiagnostics(userId!),
    enabled: !!userId,
  })
}

export function useUpdateDiagnosticStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status: DiagnosticStatus
      adminNotes?: string
    }) => updateDiagnosticStatus(id, status, adminNotes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.setQueryData(['diagnostics', 'detail', data.id], data)
    },
    onError: (err) => logError('useUpdateDiagnosticStatus', err),
  })
}

export function useUpsertDraftDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: string | null
      payload: DiagnosticUpdate & { user_id: string }
    }) => upsertDraftDiagnostic(draftId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useUpsertDraftDiagnostic', err),
  })
}

export function useDeleteDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDiagnostic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useDeleteDiagnostic', err),
  })
}
