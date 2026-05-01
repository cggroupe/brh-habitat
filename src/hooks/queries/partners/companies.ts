import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchMyCompany,
  fetchCompanyById,
  fetchAllCompanies,
  updateCompany,
  fetchCompanyDashboardStats,
} from '@/api/companies'
import type { CompanyUpdate } from '@/api/companies'

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
