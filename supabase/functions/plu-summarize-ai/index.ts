/**
 * Edge Function : plu-summarize-ai (Phase 19 Sprint D)
 *
 * Récupère le PDF du règlement PLUi d'une commune via GPU
 * (geoportail-urbanisme.gouv.fr) et le résume via Claude Sonnet 4.6 (PDF input
 * direct supporté).
 *
 * Body : { code_insee: string, force_refresh?: boolean }
 * Returns : { summary: BrhPluSummary, source: 'cache' | 'api', cost_eur_cents: number }
 *
 * Cache TTL 180j dans brh_plu_summaries.
 *
 * Auth : authenticated requise.
 *
 * Coût estimé : ~0.01-0.03 € / résumé selon taille PDF.
 *
 * Doc GPU API :
 *   https://www.geoportail-urbanisme.gouv.fr/api/document?territory={insee}
 *   Returns : [{ id, type, name, document_url, ... }]
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// GPU document API gardé pour référence — on utilise désormais apicarto IGN
// (zone-urba sur centroid commune) qui marche bien mieux pour récupérer le PDF.
// const GPU_API = 'https://www.geoportail-urbanisme.gouv.fr/api/document'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929' // Sonnet 4.6 alias actuel
const MAX_PDF_SIZE_MB = 32  // Limite hard Anthropic Messages PDF input (32 MB / 100 pages)
const FETCH_TIMEOUT_MS = 30_000
const CACHE_TTL_S = 15_552_000 // 180j

interface RequestBody {
  code_insee?: string
  force_refresh?: boolean
}

interface GpuGrid {
  name?: string
  title?: string
  type?: 'municipality' | 'epci' | 'departement'
}

interface GpuDocument {
  id?: string | number
  type?: string  // 'PLU', 'PLUi', 'POS', 'CC', 'RNU', 'SUP'
  name?: string
  document_url?: string
  approval_date?: string
  /** Quelques variantes selon endpoint GPU */
  document_pdf?: string
  url?: string
  /** Status raw GPU : 'document.published', 'document.deleted', etc. */
  status?: string
  legalStatus?: string
  grid?: GpuGrid
  originalName?: string
}

const SYSTEM_PROMPT = `Tu es un expert en urbanisme français. On te fournit le règlement PLUi (Plan Local d'Urbanisme intercommunal) d'une commune en PDF.

Ta mission : extraire les informations clés sous forme de JSON structuré pour une agence immobilière qui prospecte des parcelles.

Renvoie UNIQUEMENT du JSON valide (pas de markdown, pas de prose), au format suivant :
{
  "zones_principales": [
    {
      "code": "UC1",
      "libelle": "Zone urbaine centrale, habitat dense",
      "hauteur_max_m": 12,
      "cos": null,
      "emprise_au_sol_pct": 60,
      "parking_min": "1 place / logement",
      "destinations_autorisees": ["habitation", "commerce", "bureaux"],
      "particularites": "ABF requis si secteur sauvegardé"
    }
  ],
  "abf_zones": ["AC1", "ZH"],
  "mentions_obligatoires": [
    "Toute construction soumise à PC",
    "Couverture en ardoise obligatoire dans le centre historique"
  ],
  "synthese": "Résumé 2-3 phrases du PLUi : zonage général + contraintes notables + opportunités rénovation."
}

Si une info n'est pas disponible, mets null. Maximum 8 zones principales (les plus représentatives). Sois précis et factuel.`

/**
 * Recupere code EPCI d'une commune via geo.api.gouv.fr (gratuit).
 * Retourne ex. '242900314' pour Brest (Brest Métropole).
 */
async function getEpciCode(insee: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes/${insee}?fields=codeEpci`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const j = (await res.json()) as { codeEpci?: string }
    return j.codeEpci ?? null
  } catch {
    return null
  }
}

/**
 * Récupère le centroid d'une commune via geo.api.gouv.fr.
 * Retourne {lat, lng} ou null.
 */
async function getCommuneCentroid(insee: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://geo.api.gouv.fr/communes/${insee}?fields=centre`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const j = (await res.json()) as { centre?: { coordinates: [number, number] } }
    const coords = j.centre?.coordinates
    if (!coords) return null
    return { lng: coords[0], lat: coords[1] }
  } catch {
    return null
  }
}

interface ApicartoFeature {
  properties?: {
    gpu_doc_id?: string
    libelle?: string
    typezone?: string
    partition?: string
    idurba?: string
    nomfic?: string
    urlfic?: string
    datappro?: string
  }
}

/**
 * Stratégie API Carto IGN (la SEULE qui marche en pratique pour récupérer le
 * PDF règlement réel d'une commune française) :
 *   1. Récupère centroid commune
 *   2. Hit https://apicarto.ign.fr/api/gpu/zone-urba?geom=POINT  → retourne
 *      le GeoJSON de la zone urbanistique au point + propriétés dont urlfic
 *      (lien direct vers PDF règlement officiel hébergé par l'EPCI).
 *
 * Cette API est filtrée côté serveur (pas le cas de geoportail-urbanisme.gouv.fr
 * qui retourne tout son corpus aléatoire). Brest, Rennes, Nantes, etc. tous OK.
 */
async function fetchGpuDocuments(insee: string): Promise<{
  docs: GpuDocument[]
  tried_epci: string | null
  apicarto_url: string | null
}> {
  const centroid = await getCommuneCentroid(insee)
  if (!centroid) return { docs: [], tried_epci: null, apicarto_url: null }

  const epci = await getEpciCode(insee)
  const geom = encodeURIComponent(JSON.stringify({
    type: 'Point',
    coordinates: [centroid.lng, centroid.lat],
  }))
  const apicartoUrl = `https://apicarto.ign.fr/api/gpu/zone-urba?geom=${geom}`

  try {
    const res = await fetch(apicartoUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return { docs: [], tried_epci: epci, apicarto_url: apicartoUrl }
    const j = (await res.json()) as { features?: ApicartoFeature[] }
    const features = j.features ?? []
    if (features.length === 0) return { docs: [], tried_epci: epci, apicarto_url: apicartoUrl }

    // Dédoublonne par urlfic (un PDF, un doc)
    const seen = new Set<string>()
    const docs: GpuDocument[] = []
    for (const f of features) {
      const p = f.properties ?? {}
      const url = p.urlfic
      if (!url || seen.has(url)) continue
      seen.add(url)
      // Extrait le type (PLUI, PLU, POS, CC) depuis idurba ex: "242900314_PLUI_20260217"
      const idMatch = (p.idurba ?? '').match(/_(PLUI|PLU|POS|CC|RNU)_/i)
      const type = idMatch ? idMatch[1].toUpperCase() : 'PLU'
      docs.push({
        id: p.gpu_doc_id,
        type: type === 'PLUI' ? 'PLUi' : type,
        document_url: url,
        approval_date: p.datappro ?? undefined,
        originalName: p.idurba ?? undefined,
      })
    }
    return { docs, tried_epci: epci, apicarto_url: apicartoUrl }
  } catch {
    return { docs: [], tried_epci: epci, apicarto_url: apicartoUrl }
  }
}

function pickBestDocument(docs: GpuDocument[]): GpuDocument | null {
  if (docs.length === 0) return null
  // Priorise PLUi > PLU > POS > CC > RNU
  const order = ['PLUi', 'PLU', 'POS', 'CC', 'RNU']
  for (const t of order) {
    const found = docs.find((d) => (d.type ?? '').toUpperCase() === t.toUpperCase())
    if (found) return found
  }
  return docs[0]
}

function getDocumentUrl(doc: GpuDocument): string | null {
  const raw = doc.document_url ?? doc.document_pdf ?? doc.url ?? null
  if (!raw) return null
  // Strip anchor #page=N que les PDFs des EPCIs incluent souvent
  return raw.split('#')[0]
}

/**
 * HEAD request pour obtenir la taille PDF avant téléchargement complet.
 * Évite de DL un PDF de 63 MB pour rien.
 */
async function getPdfSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const len = res.headers.get('content-length')
    if (!len) return null
    return parseInt(len, 10) / 1_048_576
  } catch {
    return null
  }
}

async function fetchPdfBase64(url: string): Promise<{ base64: string; size_mb: number; oversize_mb?: number } | null> {
  try {
    // 1) HEAD check de la taille
    const headSizeMb = await getPdfSize(url)
    if (headSizeMb !== null && headSizeMb > MAX_PDF_SIZE_MB) {
      console.error(`PDF too large (HEAD): ${headSizeMb.toFixed(2)} MB > ${MAX_PDF_SIZE_MB} MB`)
      return { base64: '', size_mb: 0, oversize_mb: headSizeMb }
    }

    const res = await fetch(url, {
      headers: { Accept: 'application/pdf' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const sizeMb = buf.byteLength / 1_048_576
    if (sizeMb > MAX_PDF_SIZE_MB) {
      console.error(`PDF too large (full): ${sizeMb.toFixed(2)} MB`)
      return { base64: '', size_mb: 0, oversize_mb: sizeMb }
    }
    // Convert to base64
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return { base64: btoa(binary), size_mb: sizeMb }
  } catch (err) {
    console.error('fetchPdfBase64 failed', err)
    return null
  }
}

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>
  usage?: { input_tokens: number; output_tokens: number }
  error?: { type: string; message: string }
}

async function callClaude(pdfBase64: string): Promise<{
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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyse ce règlement PLUi et renvoie le JSON structuré demandé. Aucun markdown, JSON pur.',
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
    // Strip éventuel markdown
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    json = JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude returned non-JSON', text.slice(0, 200), err)
  }

  // Pricing Sonnet 4.5/4.6 : $3/MTok input + $15/MTok output (approx)
  // Convert USD → EUR ~0.92 → cents
  const tokensIn = data.usage?.input_tokens ?? 0
  const tokensOut = data.usage?.output_tokens ?? 0
  const costUsd = (tokensIn * 3 + tokensOut * 15) / 1_000_000
  const costEurCents = Math.round(costUsd * 0.92 * 100)

  return { json, tokensInput: tokensIn, tokensOutput: tokensOut, costEurCents }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'plu-summarize-ai', { maxRequests: 10, windowSeconds: 60 })
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
    if (!body.code_insee || !/^\d[A-B0-9]\d{3}$|^\d{5}$/.test(body.code_insee)) {
      return new Response(JSON.stringify({ error: 'code_insee_required' }), {
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
        .from('brh_plu_summaries')
        .select('*')
        .eq('code_insee', body.code_insee)
        .maybeSingle()
      if (cached) {
        const ageMs = Date.now() - new Date(cached.fetched_at).getTime()
        if (ageMs < CACHE_TTL_S * 1000) {
          return new Response(
            JSON.stringify({ summary: cached, source: 'cache' }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // Fetch documents PLU via apicarto IGN (zone-urba sur centroid commune)
    const { docs, tried_epci, apicarto_url } = await fetchGpuDocuments(body.code_insee)
    const doc = pickBestDocument(docs)
    if (!doc) {
      return new Response(
        JSON.stringify({
          error: 'no_plu_document_found',
          insee: body.code_insee,
          tried_epci,
          apicarto_url,
          hint: tried_epci
            ? `Aucun PLU/PLUi numérisé pour ${body.code_insee} (EPCI ${tried_epci}). Probablement en RNU ou PLUi pas encore référencé.`
            : `Aucun PLU/PLUi numérisé pour ${body.code_insee}.`,
        }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const pdfUrl = getDocumentUrl(doc)
    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'no_pdf_url', doc }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch PDF
    const pdf = await fetchPdfBase64(pdfUrl)
    if (!pdf) {
      return new Response(
        JSON.stringify({ error: 'pdf_fetch_failed', url: pdfUrl }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    // PDF trop gros (cas Brest Métropole 63 MB) — pas analysable par Claude
    if (pdf.oversize_mb !== undefined) {
      return new Response(
        JSON.stringify({
          error: 'pdf_too_large',
          url: pdfUrl,
          size_mb: pdf.oversize_mb,
          max_mb: MAX_PDF_SIZE_MB,
          hint: `Le règlement PLUi de cette commune fait ${pdf.oversize_mb.toFixed(0)} MB, au-delà de la limite Claude (${MAX_PDF_SIZE_MB} MB / 100 pages). Le PDF reste accessible directement via le lien officiel ci-dessous.`,
          pdf_url: pdfUrl,
        }),
        { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Call Claude
    const ai = await callClaude(pdf.base64)
    if (!ai.json) {
      return new Response(
        JSON.stringify({ error: 'ai_invalid_json' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Upsert cache
    const row = {
      code_insee: body.code_insee,
      commune: null,
      departement: body.code_insee.slice(0, 2),
      gpu_document_id: String(doc.id ?? ''),
      gpu_document_type: doc.type ?? null,
      gpu_document_date: doc.approval_date ?? null,
      gpu_pdf_url: pdfUrl,
      summary: ai.json,
      ai_model: ANTHROPIC_MODEL,
      ai_tokens_input: ai.tokensInput,
      ai_tokens_output: ai.tokensOutput,
      ai_cost_eur_cents: ai.costEurCents,
      pdf_pages: null, // pourra être extrait V2
      fetched_at: new Date().toISOString(),
    }
    await supa.from('brh_plu_summaries').upsert(row, { onConflict: 'code_insee' })

    return new Response(
      JSON.stringify({ summary: row, source: 'api', cost_eur_cents: ai.costEurCents }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
