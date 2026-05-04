/**
 * Phase R1-prep / R2 — Hooks React Query pour agences immobilières.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agencesImmoApi, type ListAgencesFilters, type AgenceImmo } from '@/api/agences-immo'

export const AGENCES_IMMO_KEY = ['agences-immo'] as const

export function useAgencesImmo(filters: ListAgencesFilters = {}) {
  return useQuery({
    queryKey: [...AGENCES_IMMO_KEY, 'list', filters] as const,
    queryFn: () => agencesImmoApi.list(filters),
    staleTime: 5 * 60_000,
  })
}

export function useAgenceImmo(id: string | null | undefined) {
  return useQuery({
    queryKey: [...AGENCES_IMMO_KEY, 'detail', id] as const,
    queryFn: () => agencesImmoApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useCreateAgenceImmo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<AgenceImmo, 'id' | 'created_at' | 'updated_at'>) =>
      agencesImmoApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCES_IMMO_KEY })
    },
  })
}

export function useUpdateAgenceImmo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Omit<AgenceImmo, 'id' | 'created_at' | 'updated_at'>>
    }) => agencesImmoApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCES_IMMO_KEY })
    },
  })
}

export function useDeleteAgenceImmo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => agencesImmoApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCES_IMMO_KEY })
    },
  })
}
