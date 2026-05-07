/**
 * Edge Function : satellite-vision-ai (Phase 19 Sprint D)
 *
 * Crop l'image aérienne IGN BD ORTHO sur une parcelle (via WMS GetMap)
 * et l'envoie à Claude Sonnet 4.6 vision pour analyse de toiture.
 *
 * Body : { parcelle_idu: string, force_refresh?: boolean }
 * Returns : { analysis: BrhSatelliteAnalysis, source: 'cache' | 'api', cost_eur_cents: number }
 *
 * Cache TTL 365j dans brh_satellite_analyses.
 *
 * Auth : authenticated requise.
 *
 * Coût estimé : ~0.02-0.04 € / Vision selon taille image.
 *
 * Doc IGN BD ORTHO :
 *   https://data.geopf.fr/wms-r/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0
 *   &LAYERS=ORTHOIMAGERY.ORTHOPHOTOS
 *   &BBOX=lat_min,lng_min,lat_max,lng_max
 *   &CRS=EPSG:4326&FORMAT=image/jpeg&WIDTH=512&HEIGHT=512
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const WMS_BASE = 'https://data.geopf.fr/wms-r/wms'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'
const FETCH_TIMEOUT_MS = 20_000
const CACHE_TTL_S = 31_536_000 // 365j
const BBOX_METERS = 80         // crop carré 80m de côté autour du centroid

interface RequestBody {
  parcelle_idu?: string
  force_refresh?: boolean
}

interface ParcelleRow {
  idu: string
  centroid_lat: number | null
  centroid_lng: number | null
  contenance_m2: number | null
}

const SYSTEM_PROMPT = `Tu es un expert toiture / photovoltaïque. On te fournit une vue aérienne haute résolution d'une parcelle (image satellite IGN BD ORTHO).

Ta mission : analyser la toiture du bâtiment principal visible et renvoyer un JSON structuré.

Renvoie UNIQUEMENT du JSON valide (pas de markdown, pas de prose), au format suivant :
{
  "type_toiture": "tuile_mecanique" | "ardoise" | "tuile_canal" | "zinc" | "tole" | "terrasse" | "autre" | "indetermine",
  "nb_pans": 2 | 4 | "monopente" | "complexe" | null,
  "orientation_principale": "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "plat" | null,
  "surface_estimee_m2": 120,
  "etat_apparent": "neuf" | "bon" | "a_renover" | "degrade" | "indetermine",
  "ombre_solaire": "aucune" | "partielle" | "importante" | "indetermine",
  "veluxes_visibles": 0,
  "potentiel_pv": "excellent" | "bon" | "moyen" | "faible" | "indetermine",
  "commentaires": "1-2 phrases : observations notables (cheminée, lucarnes, terrasse, piscine, état général)"
}

Sois factuel. Si tu ne peux pas déterminer un champ avec certitude, mets "indetermine" ou null. Les analyses de toiture sont délicates : signale les incertitudes dans les commentaires.`

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>
  usage?: { input_tokens: number; output_tokens: number }
  error?: { type: string; message: string }
}

/**
 * Convertit une distance en mètres en degrés latitude/longitude.
 * Approximation simple (suffisante pour BBOX 80m).
 */
function metersToDegrees(meters: number, lat: number): { dLat: number; dLng: number } {
  const dLat = meters / 111_000 // 1° lat ≈ 111 km
  const dLng = meters / (111_000 * Math.cos((lat * Math.PI) / 180))
  return { dLat, dLng }
}

async function fetchOrthoImage(
  lat: number,
  lng: number,
  bboxMeters: number = BBOX_METERS,
): Promise<{ base64: string; size_kb: number } | null> {
  const half = bboxMeters / 2
  const { dLat, dLng } = metersToDegrees(half, lat)

  // CRS EPSG:4326 = ordre lat,lng (WMS 1.3.0)
  const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: 'ORTHOIMAGERY.ORTHOPHOTOS',
    STYLES: '',
    CRS: 'EPSG:4326',
    BBOX: bbox,
    WIDTH: '768',
    HEIGHT: '768',
    FORMAT: 'image/jpeg',
  })

  try {
    const res = await fetch(`${WMS_BASE}?${params.toString()}`, {
      headers: { Accept: 'image/jpeg' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error(`WMS error ${res.status}`)
      return null
    }
    const buf = await res.arrayBuffer()
    const sizeKb = buf.byteLength / 1024
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return { base64: btoa(binary), size_kb: sizeKb }
  } catch (err) {
    console.error('fetchOrthoImage failed', err)
    return null
  }
}

async function callClaudeVision(imageBase64: string): Promise<{
  json: Record<string, unknown> | null
  tokensInput: number
  tokensOutput: number
  costEurCents: number
}> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyse cette toiture et renvoie le JSON structuré demandé. JSON pur, aucun markdown.',
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json()) as ClaudeResponse
  if (data.error) throw new Error(`anthropic_${data.error.type}: ${data.error.message}`)

  const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
  let json: Record<string, unknown> | null = null
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    json = JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude returned non-JSON', text.slice(0, 200), err)
  }

  const tokensIn = data.usage?.input_tokens ?? 0
  const tokensOut = data.usage?.output_tokens ?? 0
  const costUsd = (tokensIn * 3 + tokensOut * 15) / 1_000_000
  const costEurCents = Math.round(costUsd * 0.92 * 100)

  return { json, tokensInput: tokensIn, tokensOutput: tokensOut, costEurCents }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'satellite-vision-ai', { maxRequests: 15, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    if (!body.parcelle_idu || body.parcelle_idu.length !== 14) {
      return new Response(JSON.stringify({ error: 'parcelle_idu_required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userResp, error: userErr } = await supa.auth.getUser(authHeader.slice(7))
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Cache check
    if (!body.force_refresh) {
      const { data: cached } = await supa
        .from('brh_satellite_analyses')
        .select('*')
        .eq('parcelle_idu', body.parcelle_idu)
        .maybeSingle()
      if (cached) {
        const ageMs = Date.now() - new Date(cached.fetched_at).getTime()
        if (ageMs < CACHE_TTL_S * 1000) {
          return new Response(
            JSON.stringify({ analysis: cached, source: 'cache' }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // Fetch parcelle (centroid)
    const { data: parcelle } = await supa
      .from('brh_parcelles_cache')
      .select('idu, centroid_lat, centroid_lng, contenance_m2')
      .eq('idu', body.parcelle_idu)
      .maybeSingle()

    if (!parcelle || parcelle.centroid_lat === null || parcelle.centroid_lng === null) {
      return new Response(JSON.stringify({ error: 'parcelle_not_geocoded' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const p = parcelle as ParcelleRow

    // Adapter BBOX selon contenance (parcelle plus grande = crop plus large, max 200m)
    const bboxMeters = Math.min(
      200,
      Math.max(60, Math.round(Math.sqrt(p.contenance_m2 ?? 1000) * 2.5)),
    )

    // Fetch image
    const img = await fetchOrthoImage(p.centroid_lat!, p.centroid_lng!, bboxMeters)
    if (!img) {
      return new Response(JSON.stringify({ error: 'wms_fetch_failed' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Call Claude vision
    const ai = await callClaudeVision(img.base64)
    if (!ai.json) {
      return new Response(JSON.stringify({ error: 'ai_invalid_json' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Build WMS URL pour audit (sans la base64)
    const wmsUrl = `${WMS_BASE}?LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&BBOX=center:${p.centroid_lat},${p.centroid_lng}&size=${bboxMeters}m`

    // Upsert
    const row = {
      parcelle_idu: body.parcelle_idu,
      lat: p.centroid_lat,
      lng: p.centroid_lng,
      bbox_meters: bboxMeters,
      analysis: ai.json,
      image_storage_path: null, // V2 : stocker l'image dans Supabase Storage
      image_url_used: wmsUrl,
      ai_model: ANTHROPIC_MODEL,
      ai_tokens_input: ai.tokensInput,
      ai_tokens_output: ai.tokensOutput,
      ai_cost_eur_cents: ai.costEurCents,
      fetched_at: new Date().toISOString(),
    }
    await supa.from('brh_satellite_analyses').upsert(row, { onConflict: 'parcelle_idu' })

    return new Response(
      JSON.stringify({ analysis: row, source: 'api', cost_eur_cents: ai.costEurCents }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
