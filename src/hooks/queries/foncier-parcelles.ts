/**
 * Phase 19 Sprint A — Hooks React Query pour parcelles cadastrales.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { foncierParcellesApi, type ParcelleQuery } from '@/api/foncier-parcelles'

export const FONCIER_PARCELLES_KEY = ['foncier-parcelles'] as const

/** Recherche dynamique (sur action utilisateur) — useMutation pour control le moment. */
export function useFetchParcelle() {
  return useMutation({
    mutationFn: (query: ParcelleQuery) => foncierParcellesApi.fetch(query),
  })
}

/** Lit le cache local par IDU (lecture rapide pour la page détail). */
export function useCachedParcelle(idu: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_PARCELLES_KEY, 'cached', idu] as const,
    queryFn: () => foncierParcellesApi.getCachedByIdu(idu!),
    enabled: !!idu,
    staleTime: 60_000,
  })
}

/** Liste de parcelles en cache (pour la liste favoris avec géométrie). */
export function useCachedParcelles(idus: string[]) {
  const sorted = [...idus].sort()
  return useQuery({
    queryKey: [...FONCIER_PARCELLES_KEY, 'cached-many', sorted] as const,
    queryFn: () => foncierParcellesApi.getCachedManyByIdu(idus),
    enabled: idus.length > 0,
    staleTime: 60_000,
  })
}

/** Geocoding via BAN api-adresse.data.gouv.fr (autocomplete). */
export function useGeocodeAddress(query: string) {
  return useQuery({
    queryKey: [...FONCIER_PARCELLES_KEY, 'geocode', query] as const,
    queryFn: () => foncierParcellesApi.geocodeAddress(query),
    enabled: query.length >= 3,
    staleTime: 5 * 60_000,
  })
}
