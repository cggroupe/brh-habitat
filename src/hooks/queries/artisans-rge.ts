/**
 * Hooks React Query — artisans-rge (Phase 13.6).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { artisansRgeApi } from '@/api/artisans-rge'
import type { GesteId } from '@/lib/dpe-engine/marketplace'

export const ARTISANS_KEY = ['artisans-rge'] as const

export function useArtisansList(filters: Parameters<typeof artisansRgeApi.list>[0]) {
  return useQuery({
    queryKey: [...ARTISANS_KEY, 'list', filters] as const,
    queryFn: () => artisansRgeApi.list(filters),
    staleTime: 5 * 60_000,
  })
}

export function useArtisanMatchForProspect(opts: {
  prospectLat: number | null
  prospectLng: number | null
  geste: GesteId | null
  departement?: '22' | '29' | '35' | '56' | null
}) {
  return useQuery({
    queryKey: [...ARTISANS_KEY, 'match', opts] as const,
    queryFn: () =>
      artisansRgeApi.matchForProspect({
        prospectLat: opts.prospectLat!,
        prospectLng: opts.prospectLng!,
        geste: opts.geste!,
        departement: opts.departement,
      }),
    enabled: !!opts.prospectLat && !!opts.prospectLng && !!opts.geste,
    staleTime: 60_000,
  })
}

export function useArtisan(id: string | undefined) {
  return useQuery({
    queryKey: [...ARTISANS_KEY, 'detail', id] as const,
    queryFn: () => artisansRgeApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateArtisanLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof artisansRgeApi.createLead>[0]) => {
      // 1. Crée le lead en DB
      const lead = await artisansRgeApi.createLead(input)

      // 2. Phase 13.6.3 — Tente d'envoyer l'email auto à l'artisan (best-effort, n'échoue pas la mutation)
      try {
        await artisansRgeApi.notifyArtisanByEmail(lead.id)
      } catch (e) {
        // L'email peut échouer (artisan sans email, Resend down) — on log mais on garde le lead
        console.warn('notify-artisan-lead failed:', e)
      }

      return lead
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ARTISANS_KEY, 'leads'] })
    },
  })
}

export function useMyArtisanLeads() {
  return useQuery({
    queryKey: [...ARTISANS_KEY, 'leads', 'mine'] as const,
    queryFn: () => artisansRgeApi.myLeads(),
    staleTime: 30_000,
  })
}
