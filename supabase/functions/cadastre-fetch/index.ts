/**
 * Edge Function : cadastre-fetch (Phase 19 Sprint A)
 *
 * Proxy api-carto IGN parcelles_express avec cache 90j dans `brh_parcelles_cache`.
 * Permet 3 modes de recherche :
 *   1. Par IDU (14 caractères) : { idu: string }
 *   2. Par INSEE + section + numéro : { code_insee, section, numero, prefixe? }
 *   3. Par point GPS (rayon) : { lat, lng, radius_m? } (défaut 100m)
 *
 * Returns :
 *   { parcelles: [{ idu, code_insee, commune, contenance_m2, geometry, ... }],
 *     source: 'cache' | 'api-carto', cached_at: ISO }
 *
 * Auth : authenticated requise (réseau pro BRH).
 *
 * Doc api-carto IGN : https://apicarto.ign.fr/api/doc/cadastre
 *   - GET /api/cadastre/parcelle?code_insee=...&section=...&numero=...
 *   - GET /api/cadastre/parcelle?geom={GeoJSON Point}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const APICARTO_BASE = 'https://apicarto.ign.fr/api/cadastre/parcelle'
const CACHE_TTL_S = 7_776_000 // 90 jours
const FETCH_TIMEOUT_MS = 8_000

interface RequestBody {
  idu?: string
  code_insee?: string
  prefixe?: string
  section?: string
  numero?: string
  lat?: number
  lng?: number
  radius_m?: number
}

interface ApiCartoFeature {
  type: 'Feature'
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: unknown[]
  }
  properties: {
    idu?: string
    numero?: string
    feuille?: number
    section?: string
    code_dep?: string
    nom_com?: string
    code_com?: string
    code_arr?: string
    contenance?: number
    com_abs?: string
    code_insee?: string
    [key: string]: unknown
  }
}

interface ApiCartoResponse {
  type: 'FeatureCollection'
  features: ApiCartoFeature[]
}

interface ParcelleOut {
  idu: string
  code_insee: string
  prefixe: string | null
  section: string | null
  numero: string | null
  commune: string | null
  departement: string | null
  contenance_m2: number | null
  geometry: ApiCartoFeature['geometry']
  centroid_lat: number | null
  centroid_lng: number | null
  raw_properties: ApiCartoFeature['properties']
}

/** Construit un IDU 14 chars depuis les composants. */
function buildIdu(insee: string, prefixe: string, section: string, numero: string): string {
  const i = insee.padStart(5, '0').slice(0, 5)
  const p = (prefixe || '000').padStart(3, '0').slice(0, 3)
  const s = section.padStart(2, '0').slice(-2)
  const n = numero.padStart(4, '0').slice(-4)
  return `${i}${p}${s}${n}`
}

/** Calcule le centroïde approximatif (moyenne des coordonnées). */
function calcCentroid(geom: ApiCartoFeature['geometry']): { lat: number | null; lng: number | null } {
  try {
    let coords: number[][] = []
    if (geom.type === 'Polygon') {
      coords = (geom.coordinates as number[][][])[0] ?? []
    } else if (geom.type === 'MultiPolygon') {
      coords = (geom.coordinates as number[][][][])[0]?.[0] ?? []
    }
    if (coords.length === 0) return { lat: null, lng: null }
    const sum = coords.reduce(
      (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
      { lng: 0, lat: 0 },
    )
    return { lat: sum.lat / coords.length, lng: sum.lng / coords.length }
  } catch {
    return { lat: null, lng: null }
  }
}

/** Mappe une feature api-carto vers le format ParcelleOut. */
function featureToParcelle(f: ApiCartoFeature): ParcelleOut {
  const props = f.properties
  // Reconstruit l'IDU si absent (rare mais pour robustesse)
  const insee = (props.code_insee ?? props.code_com ?? '') as string
  const section = (props.section ?? '') as string
  const numero = (props.numero ?? '') as string
  const prefixe = (props.com_abs ?? props.code_arr ?? '000') as string
  const idu = (props.idu as string) ?? buildIdu(insee, prefixe, section, numero)
  const centroid = calcCentroid(f.geometry)

  return {
    idu,
    code_insee: insee,
    prefixe: prefixe || null,
    section: section || null,
    numero: numero || null,
    commune: (props.nom_com ?? null) as string | null,
    departement: (props.code_dep ?? (insee.slice(0, 2) || null)) as string | null,
    contenance_m2: typeof props.contenance === 'number' ? props.contenance : null,
    geometry: f.geometry,
    centroid_lat: centroid.lat,
    centroid_lng: centroid.lng,
    raw_properties: props,
  }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit
  const rl = checkRateLimit(req, 'cadastre-fetch', { maxRequests: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  // Auth check : JWT user dans le header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifie user authentifié
    const { data: userResp, error: userErr } = await supa.auth.getUser(authHeader.slice(7))
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ---- Mode 1 : recherche par IDU (cache hit prioritaire) ----
    if (body.idu) {
      if (body.idu.length !== 14) {
        return new Response(JSON.stringify({ error: 'idu_invalid_length' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const { data: cached } = await supa
        .from('brh_parcelles_cache')
        .select('*')
        .eq('idu', body.idu)
        .maybeSingle()

      if (cached) {
        const fetchedAt = new Date(cached.fetched_at).getTime()
        const ageMs = Date.now() - fetchedAt
        if (ageMs < CACHE_TTL_S * 1000) {
          return new Response(
            JSON.stringify({
              parcelles: [cached],
              source: 'cache',
              cached_at: cached.fetched_at,
            }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }

      // Cache miss : appel api-carto par section+numéro
      const insee = body.idu.slice(0, 5)
      const prefixe = body.idu.slice(5, 8)
      const section = body.idu.slice(8, 10)
      const numero = body.idu.slice(10, 14)

      const url = `${APICARTO_BASE}?code_insee=${insee}&section=${section}&numero=${numero}${
        prefixe !== '000' ? `&com_abs=${prefixe}` : ''
      }`

      const apiRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: 'apicarto_unavailable', status: apiRes.status }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }

      const data = (await apiRes.json()) as ApiCartoResponse
      const parcelles = (data.features ?? []).map(featureToParcelle)

      // Upsert cache
      if (parcelles.length > 0) {
        await supa.from('brh_parcelles_cache').upsert(
          parcelles.map((p) => ({
            idu: p.idu,
            code_insee: p.code_insee,
            prefixe: p.prefixe,
            section: p.section,
            numero: p.numero,
            commune: p.commune,
            departement: p.departement,
            contenance_m2: p.contenance_m2,
            geometry: p.geometry,
            centroid_lat: p.centroid_lat,
            centroid_lng: p.centroid_lng,
            raw_properties: p.raw_properties,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: 'idu' },
        )
      }

      return new Response(
        JSON.stringify({ parcelles, source: 'api-carto', cached_at: new Date().toISOString() }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Mode 2 : recherche par insee + section + numéro ----
    if (body.code_insee && body.section && body.numero) {
      const url = `${APICARTO_BASE}?code_insee=${encodeURIComponent(body.code_insee)}&section=${encodeURIComponent(body.section)}&numero=${encodeURIComponent(body.numero)}${
        body.prefixe ? `&com_abs=${encodeURIComponent(body.prefixe)}` : ''
      }`

      const apiRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!apiRes.ok) {
        return new Response(JSON.stringify({ error: 'apicarto_unavailable', status: apiRes.status }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const data = (await apiRes.json()) as ApiCartoResponse
      const parcelles = (data.features ?? []).map(featureToParcelle)

      if (parcelles.length > 0) {
        await supa.from('brh_parcelles_cache').upsert(
          parcelles.map((p) => ({
            idu: p.idu,
            code_insee: p.code_insee,
            prefixe: p.prefixe,
            section: p.section,
            numero: p.numero,
            commune: p.commune,
            departement: p.departement,
            contenance_m2: p.contenance_m2,
            geometry: p.geometry,
            centroid_lat: p.centroid_lat,
            centroid_lng: p.centroid_lng,
            raw_properties: p.raw_properties,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: 'idu' },
        )
      }

      return new Response(
        JSON.stringify({ parcelles, source: 'api-carto', cached_at: new Date().toISOString() }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Mode 3 : recherche par point GPS (rayon) ----
    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      const radius = body.radius_m && body.radius_m > 0 ? Math.min(body.radius_m, 500) : 100

      // api-carto accepte un GeoJSON via le param `geom`
      // On utilise un Point + buffer côté front (api-carto ne fait pas le buffer auto).
      // Pour simplifier V1, on cherche par Point exact (api-carto retourne la parcelle contenante).
      const point = JSON.stringify({ type: 'Point', coordinates: [body.lng, body.lat] })
      const url = `${APICARTO_BASE}?geom=${encodeURIComponent(point)}`

      const apiRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: 'apicarto_unavailable', status: apiRes.status }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const data = (await apiRes.json()) as ApiCartoResponse
      const parcelles = (data.features ?? []).map(featureToParcelle)

      if (parcelles.length > 0) {
        await supa.from('brh_parcelles_cache').upsert(
          parcelles.map((p) => ({
            idu: p.idu,
            code_insee: p.code_insee,
            prefixe: p.prefixe,
            section: p.section,
            numero: p.numero,
            commune: p.commune,
            departement: p.departement,
            contenance_m2: p.contenance_m2,
            geometry: p.geometry,
            centroid_lat: p.centroid_lat,
            centroid_lng: p.centroid_lng,
            raw_properties: p.raw_properties,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: 'idu' },
        )
      }

      return new Response(
        JSON.stringify({
          parcelles,
          source: 'api-carto',
          cached_at: new Date().toISOString(),
          radius_m: radius,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'invalid_query',
        message:
          'Provide one of: { idu } | { code_insee, section, numero, prefixe? } | { lat, lng, radius_m? }',
      }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'internal_error',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
