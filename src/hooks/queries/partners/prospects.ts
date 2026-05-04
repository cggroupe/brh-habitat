import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
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
import type { ProspectStatus } from '@/types/partner'

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
