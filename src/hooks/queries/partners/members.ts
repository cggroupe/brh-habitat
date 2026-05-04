import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchCompanyMembers,
  inviteMember,
  removeMember,
} from '@/api/company-members'

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
