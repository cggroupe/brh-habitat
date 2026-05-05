/**
 * Phase 16.1 — Hooks React Query pour l'équipe agence.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agenceMembersApi } from '@/api/agence-members'
import type { AgenceMemberPermissions } from '@/types/agence-permissions'

export const AGENCE_MEMBERS_KEY = ['agence-members'] as const

export function useAgenceMembers(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...AGENCE_MEMBERS_KEY, agenceId] as const,
    queryFn: () => agenceMembersApi.list(agenceId!),
    enabled: !!agenceId,
    staleTime: 30_000,
  })
}

export function useInviteAgenceEmployee(agenceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      email,
      permissions,
    }: {
      email: string
      permissions: AgenceMemberPermissions
    }) => agenceMembersApi.inviteEmployee(email, permissions),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...AGENCE_MEMBERS_KEY, agenceId] })
    },
  })
}

export function useSetAgenceMemberPermissions(agenceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string
      permissions: AgenceMemberPermissions
    }) => agenceMembersApi.setPermissions(memberId, permissions),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...AGENCE_MEMBERS_KEY, agenceId] })
    },
  })
}

export function useRemoveAgenceMember(agenceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => agenceMembersApi.remove(memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...AGENCE_MEMBERS_KEY, agenceId] })
    },
  })
}
