import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserCases,
  fetchCaseById,
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
} from '@/api/cases'
import type { CaseStatus } from '@/types/database'
import type { Database } from '@/types/database'

type CaseInsert = Database['public']['Tables']['brh_cases']['Insert']
type CaseUpdate = Database['public']['Tables']['brh_cases']['Update']

export function useUserCases(userId: string | undefined) {
  return useQuery({
    queryKey: ['cases', 'user', userId],
    queryFn: () => fetchUserCases(userId!),
    enabled: !!userId,
  })
}

export function useCaseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => fetchCaseById(id!),
    enabled: !!id,
  })
}

export function useAdminCases(page: number, status?: CaseStatus) {
  return useQuery({
    queryKey: ['cases', 'admin', page, status],
    queryFn: () => fetchCases(page, status),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CaseInsert) => createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CaseUpdate }) =>
      updateCase(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.setQueryData(['cases', 'detail', data.id], data)
    },
  })
}

export function useDeleteCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
