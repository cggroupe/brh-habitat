/**
 * Hooks React Query pour brh_disponibilites — Phase 18 v2.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  disponibilitesApi,
  type DisponibiliteFilters,
  type DisponibiliteInput,
} from '@/api/disponibilites'

export const DISPONIBILITES_KEY = ['disponibilites'] as const

export function useDisponibilites(filters: DisponibiliteFilters = {}) {
  return useQuery({
    queryKey: [...DISPONIBILITES_KEY, 'list', filters],
    queryFn: () => disponibilitesApi.list(filters),
    staleTime: 30_000,
  })
}

export function useMyDisponibilites(proId: string | null | undefined) {
  return useQuery({
    queryKey: [...DISPONIBILITES_KEY, 'mine', proId],
    queryFn: () => (proId ? disponibilitesApi.listMine(proId) : Promise.resolve([])),
    enabled: !!proId,
    staleTime: 30_000,
  })
}

export function useDisponibilite(id: string | null | undefined) {
  return useQuery({
    queryKey: [...DISPONIBILITES_KEY, 'detail', id],
    queryFn: () => (id ? disponibilitesApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateDisponibilite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proId, input }: { proId: string; input: DisponibiliteInput }) =>
      disponibilitesApi.create(proId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DISPONIBILITES_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export function useUpdateDisponibilite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DisponibiliteInput> }) =>
      disponibilitesApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPONIBILITES_KEY }),
  })
}

export function useArchiveDisponibilite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => disponibilitesApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPONIBILITES_KEY }),
  })
}

export function useDeleteDisponibilite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => disponibilitesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPONIBILITES_KEY }),
  })
}
