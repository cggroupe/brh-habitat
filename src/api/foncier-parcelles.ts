/**
 * Phase 19 Sprint A — API parcelles cadastrales (api-carto IGN proxy).
 *
 * Pair volontaire avec hooks/queries/foncier-parcelles.ts.
 *
 * Workflow :
 *   1. UI demande recherche (idu / insee+section+numero / lat+lng)
 *   2. Appel EF `cadastre-fetch` qui check cache puis api-carto IGN
 *   3. Retour GeoJSON + métadonnées + cache 90j Supabase
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export type ParcelleGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown[]
}

export interface FoncierParcelle {
  idu: string
  code_insee: string
  prefixe: string | null
  section: string | null
  numero: string | null
  commune: string | null
  departement: string | null
  contenance_m2: number | null
  geometry: ParcelleGeometry
  centroid_lat: number | null
  centroid_lng: number | null
  raw_properties?: Record<string, unknown>
  fetched_at?: string
}

export interface FetchResult {
  parcelles: FoncierParcelle[]
  source: 'cache' | 'api-carto'
  cached_at: string
  radius_m?: number
}

export type ParcelleQuery =
  | { idu: string }
  | { code_insee: string; section: string; numero: string; prefixe?: string }
  | { lat: number; lng: number; radius_m?: number }

export const foncierParcellesApi = {
  /**
   * Recherche parcelle via EF cadastre-fetch (cache 90j + api-carto IGN fallback).
   */
  async fetch(query: ParcelleQuery): Promise<FetchResult> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Pas de session active')
    }

    const res = await fetch(edgeFunctionUrl('cadastre-fetch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(query),
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(json.error ?? `cadastre_fetch_http_${res.status}`)
    }

    return (await res.json()) as FetchResult
  },

  /** Lit directement le cache local (sans appel EF, pour les listes). */
  async getCachedByIdu(idu: string): Promise<FoncierParcelle | null> {
    const { data, error } = await supabase
      .from('brh_parcelles_cache')
      .select('*')
      .eq('idu', idu)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as FoncierParcelle | null
  },

  /** Lit plusieurs parcelles en cache par leur IDU (pour la liste favoris). */
  async getCachedManyByIdu(idus: string[]): Promise<FoncierParcelle[]> {
    if (idus.length === 0) return []
    const { data, error } = await supabase
      .from('brh_parcelles_cache')
      .select('*')
      .in('idu', idus)
    if (error) throw error
    return (data ?? []) as FoncierParcelle[]
  },

  /** Recherche d'adresse via api-adresse.data.gouv.fr (BAN, gratuit, sans auth). */
  async geocodeAddress(query: string): Promise<
    Array<{ label: string; lat: number; lng: number; postcode?: string; city?: string }>
  > {
    if (!query || query.length < 3) return []
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&autocomplete=1`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] }
        properties: { label: string; postcode?: string; city?: string }
      }>
    }
    return (data.features ?? []).map((f) => ({
      label: f.properties.label,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      postcode: f.properties.postcode,
      city: f.properties.city,
    }))
  },
}
