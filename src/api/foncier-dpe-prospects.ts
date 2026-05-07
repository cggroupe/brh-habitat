/**
 * Phase 19 Sprint F — API DPE prospects pour layer carte foncier.
 *
 * Réutilise la table existante `brh_dpe_prospects` (59k DPE F/G migrés Phase 6.2).
 * Filtre par BBOX géo + DPE rating pour afficher les pings colorés sur la carte.
 */
import { supabase } from '@/lib/supabase'
import type { DpeRating } from '@/components/foncier/DpeMarker'

export interface DpeProspectMarker {
  id: string
  lat: number
  lng: number
  dpe_rating: DpeRating
  adresse: string | null
  commune: string | null
  surface: number | null
  code_insee_commune: string | null
}

export interface DpeBbox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface DpeProspectFilters {
  bbox?: DpeBbox
  ratings?: DpeRating[]
  limit?: number
  departement?: string
}

export const foncierDpeProspectsApi = {
  /**
   * Liste des prospects DPE dans un BBOX géo + filtres par rating.
   * Utilise les colonnes lat/lng de brh_dpe_prospects (déjà géocodées Phase 6.2).
   */
  async listByBbox(filters: DpeProspectFilters): Promise<DpeProspectMarker[]> {
    let q = supabase
      .from('brh_dpe_prospects')
      .select('id, latitude, longitude, etiquette_dpe, adresse, commune, surface_habitable, code_insee_commune')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('etiquette_dpe', 'is', null)
      .limit(Math.min(filters.limit ?? 500, 2000))

    // Filter ratings
    const ratings = filters.ratings ?? ['F', 'G']
    q = q.in('etiquette_dpe', ratings)

    // BBOX
    if (filters.bbox) {
      q = q
        .gte('latitude', filters.bbox.minLat)
        .lte('latitude', filters.bbox.maxLat)
        .gte('longitude', filters.bbox.minLng)
        .lte('longitude', filters.bbox.maxLng)
    }

    if (filters.departement) {
      q = q.eq('departement', filters.departement)
    }

    const { data, error } = await q
    if (error) throw error

    type RawRow = {
      id: string
      latitude: number | null
      longitude: number | null
      etiquette_dpe: string | null
      adresse: string | null
      commune: string | null
      surface_habitable: number | null
      code_insee_commune: string | null
    }

    return ((data ?? []) as RawRow[])
      .filter(
        (r): r is RawRow & { latitude: number; longitude: number; etiquette_dpe: DpeRating } =>
          r.latitude !== null &&
          r.longitude !== null &&
          !!r.etiquette_dpe &&
          ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(r.etiquette_dpe),
      )
      .map((r) => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        dpe_rating: r.etiquette_dpe as DpeRating,
        adresse: r.adresse,
        commune: r.commune,
        surface: r.surface_habitable,
        code_insee_commune: r.code_insee_commune,
      }))
  },
}
