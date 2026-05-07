/**
 * Phase 19 Sprint D — APIs IA killer features (PLU + Vision toiture).
 *
 * 2 features distinctes mais regroupées dans foncier-ia pour cohérence UI :
 *   - foncierPluApi  → résumé PLUi via Claude Sonnet 4.6 (PDF input)
 *   - foncierSatelliteApi → analyse Vision IA toiture (BD ORTHO + Claude vision)
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

/* =========================== PLU SUMMARIES ============================ */

export interface PluZone {
  code: string
  libelle: string | null
  hauteur_max_m: number | null
  cos: number | null
  emprise_au_sol_pct: number | null
  parking_min: string | null
  destinations_autorisees: string[]
  particularites: string | null
}

export interface PluSummaryContent {
  zones_principales: PluZone[]
  abf_zones: string[]
  mentions_obligatoires: string[]
  synthese: string
}

export interface PluSummary {
  code_insee: string
  commune: string | null
  departement: string | null
  gpu_document_id: string | null
  gpu_document_type: string | null
  gpu_document_date: string | null
  gpu_pdf_url: string | null
  summary: PluSummaryContent
  ai_model: string
  ai_tokens_input: number | null
  ai_tokens_output: number | null
  ai_cost_eur_cents: number | null
  pdf_pages: number | null
  fetched_at: string
  updated_at: string
}

export const foncierPluApi = {
  /** Lit le cache local (pas d'appel IA). */
  async getCached(codeInsee: string): Promise<PluSummary | null> {
    const { data, error } = await supabase
      .from('brh_plu_summaries')
      .select('*')
      .eq('code_insee', codeInsee)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as PluSummary | null
  },

  /** Lance le résumé IA (cache 180j respecté côté EF). */
  async summarize(codeInsee: string, forceRefresh = false): Promise<PluSummary> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('plu-summarize-ai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ code_insee: codeInsee, force_refresh: forceRefresh }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `plu_summarize_http_${res.status}`)
    }
    const data = (await res.json()) as { summary: PluSummary }
    return data.summary
  },
}

/* =========================== SATELLITE VISION ============================ */

export interface SatelliteAnalysisContent {
  type_toiture: string | null
  nb_pans: number | string | null
  orientation_principale: string | null
  surface_estimee_m2: number | null
  etat_apparent: string | null
  ombre_solaire: string | null
  veluxes_visibles: number | null
  potentiel_pv: string | null
  commentaires: string | null
}

export interface SatelliteAnalysis {
  parcelle_idu: string
  lat: number
  lng: number
  bbox_meters: number
  analysis: SatelliteAnalysisContent
  image_storage_path: string | null
  image_url_used: string | null
  ai_model: string
  ai_tokens_input: number | null
  ai_tokens_output: number | null
  ai_cost_eur_cents: number | null
  fetched_at: string
  updated_at: string
}

export const foncierSatelliteApi = {
  async getCached(parcelleIdu: string): Promise<SatelliteAnalysis | null> {
    const { data, error } = await supabase
      .from('brh_satellite_analyses')
      .select('*')
      .eq('parcelle_idu', parcelleIdu)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as SatelliteAnalysis | null
  },

  async analyze(parcelleIdu: string, forceRefresh = false): Promise<SatelliteAnalysis> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('satellite-vision-ai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ parcelle_idu: parcelleIdu, force_refresh: forceRefresh }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `satellite_vision_http_${res.status}`)
    }
    const data = (await res.json()) as { analysis: SatelliteAnalysis }
    return data.analysis
  },
}
