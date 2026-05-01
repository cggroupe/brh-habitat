/**
 * Hook React Query pour les aides locales (Phase 10).
 */

import { useQuery } from '@tanstack/react-query'
import { fetchAidesLocales, type AideLocale, type CouleurMPR } from '@/lib/dpe-engine'

export function useAidesLocales(opts: { codeInsee?: string; couleur?: CouleurMPR }) {
  return useQuery<AideLocale[]>({
    queryKey: ['aides-locales', opts.codeInsee, opts.couleur],
    queryFn: () =>
      fetchAidesLocales({
        codeInsee: opts.codeInsee!,
        couleur: opts.couleur,
      }),
    enabled: !!opts.codeInsee && opts.codeInsee.length === 5,
    staleTime: 1000 * 60 * 30, // 30 min cache
  })
}
