/**
 * Hooks React Query — audits.
 * Pair volontaire avec src/api/audits.ts.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { auditsApi } from '@/api/audits'
import type { AuditRow } from '@/api/schemas'
import type { AuditInputs } from '@/lib/dpe-engine/types'

export const AUDITS_KEY = ['audits'] as const

export function useAudits() {
  return useQuery({
    queryKey: AUDITS_KEY,
    queryFn: auditsApi.list,
  })
}

export function useAudit(id: string | undefined) {
  return useQuery({
    queryKey: ['audits', id],
    queryFn: () => auditsApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inputs: AuditInputs) => auditsApi.create(inputs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUDITS_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export function useUpdateAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, partial }: { id: string; partial: Partial<AuditRow> }) =>
      auditsApi.update(id, partial),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['audits', data.id] })
      qc.invalidateQueries({ queryKey: AUDITS_KEY })
    },
  })
}

export function useComputeAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (auditId: string) => auditsApi.compute(auditId),
    onSuccess: (_, auditId) => {
      qc.invalidateQueries({ queryKey: ['audits', auditId] })
      qc.invalidateQueries({ queryKey: AUDITS_KEY })
    },
  })
}

export function useFinalizeAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => auditsApi.finalize(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUDITS_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export function useDeleteAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => auditsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUDITS_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}
