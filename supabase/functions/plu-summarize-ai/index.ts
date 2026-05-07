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

const GPU_API = 'https://www.geoportail-urbanisme.gouv.fr/api/document'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929' // Sonnet 4.6 alias actuel
const MAX_PDF_SIZE_MB = 20  // Anthropic accepte jusqu'à 32 MB / 100 pages
const FETCH_TIMEOUT_MS = 30_000
const CACHE_TTL_S = 15_552_000 // 180j

interface RequestBody {
  code_insee?: string
  force_refresh?: boolean
}

interface GpuDocument {
  id?: string | number
  type?: string  // 'PLU', 'PLUi', 'POS', 'CC', 'RNU'
  name?: string
  document_url?: string
  approval_date?: string
  /** Quelques variantes selon endpoint GPU */
  document_pdf?: string
  url?: string
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

async function fetchGpuDocuments(insee: string): Promise<GpuDocument[]> {
  // Plusieurs variantes d'endpoint GPU selon les versions
  const urls = [
    `${GPU_API}?territory=${insee}&type=PLUi`,
    `${GPU_API}?territory=${insee}&type=PLU`,
    `${GPU_API}?territory=${insee}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (res.ok) {
        const data = await res.json()
        const docs = (Array.isArray(data) ? data : data.results ?? data.documents ?? []) as GpuDocument[]
        if (docs.length > 0) return docs
      }
    } catch {
      // continue to next url
    }
  }
  return []
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
  return doc.document_url ?? doc.document_pdf ?? doc.url ?? null
}

async function fetchPdfBase64(url: string): Promise<{ base64: string; size_mb: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/pdf' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const sizeMb = buf.byteLength / 1_048_576
    if (sizeMb > MAX_PDF_SIZE_MB) {
      console.error(`PDF too large: ${sizeMb.toFixed(2)} MB`)
      return null
    }
    // Convert to base64 (Deno.encodeBase64 syntax)
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

    // Fetch documents GPU
    const docs = await fetchGpuDocuments(body.code_insee)
    const doc = pickBestDocument(docs)
    if (!doc) {
      return new Response(
        JSON.stringify({ error: 'no_plu_document_found', insee: body.code_insee }),
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
