import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  brhVisitsApi,
  brhTravauxApi,
  type PosteTechnique,
  type TravauxPatch,
} from '@/api/brh-personne-visits-travaux'

export function usePersonneVisits(personneId: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'personne-visits', personneId],
    queryFn: () => brhVisitsApi.listVisits(personneId as string),
    enabled: !!personneId,
    staleTime: 30_000,
  })
}

export function useMarkSeen(personneId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts: { type?: string; note?: string | null } = {}) =>
      brhVisitsApi.markSeen(personneId, opts.type ?? 'visite_terrain', opts.note ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'personne-visits', personneId] })
    },
  })
}

export function usePersonneTravaux(personneId: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'personne-travaux', personneId],
    queryFn: () => brhTravauxApi.list(personneId as string),
    enabled: !!personneId,
    staleTime: 30_000,
  })
}

export function useUpsertTravaux(personneId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { poste: PosteTechnique; patch: TravauxPatch }) =>
      brhTravauxApi.upsert(personneId, input.poste, input.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'personne-travaux', personneId] })
    },
  })
}
