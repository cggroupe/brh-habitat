/**
 * Phase R2 — Hooks React Query pour tracking terrain.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fieldVisitsApi,
  type ListVisitsFilters,
  type CreateVisitPayload,
  type UpdateVisitPayload,
  type VisitStatus,
  type VisitTargetType,
} from '@/api/field-visits'

export const FIELD_VISITS_KEY = ['field-visits'] as const

export function useFieldVisits(filters: ListVisitsFilters = {}) {
  return useQuery({
    queryKey: [...FIELD_VISITS_KEY, 'list', filters] as const,
    queryFn: () => fieldVisitsApi.list(filters),
    staleTime: 60_000,
  })
}

export function useVisitsForTarget(
  targetType: VisitTargetType,
  targetId: string | null | undefined,
  companyId?: string,
) {
  return useQuery({
    queryKey: [...FIELD_VISITS_KEY, 'target', targetType, targetId, companyId] as const,
    queryFn: () => fieldVisitsApi.listForTarget(targetType, targetId!, companyId),
    enabled: !!targetId,
    staleTime: 60_000,
  })
}

export function useCreateVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateVisitPayload) => fieldVisitsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FIELD_VISITS_KEY })
    },
  })
}

export function useUpdateVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateVisitPayload }) =>
      fieldVisitsApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FIELD_VISITS_KEY })
    },
  })
}

export function useCompleteVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string
      status: VisitStatus
      notes?: string
    }) => fieldVisitsApi.complete(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FIELD_VISITS_KEY })
    },
  })
}

export function useDeleteVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fieldVisitsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FIELD_VISITS_KEY })
    },
  })
}
