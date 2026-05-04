/**
 * API external-data — wrappers EF Phase 11.1.
 *
 * Pattern volontaire pair avec hooks/queries/external-data.ts (cf. CLAUDE.md "Pattern API ↔ Hooks").
 *
 * Réf : docs/wiki/external-data-sources.md § Hooks React Query.
 */

import { supabase } from '@/lib/supabase'
import type { ScoreBreakdown, ScoreV2Segment } from '@/lib/dpe-engine/external/types'

export interface EnrichProspectResult {
  score_v2: number
  segment: ScoreV2Segment
  breakdown: ScoreBreakdown
  enriched_fields: string[]
}

export interface GeorisquesLookupResult {
  rga: unknown
  radon: unknown
  inondation: unknown
  cavites: unknown
  source: 'cache' | 'api'
}

export const externalDataApi = {
  /**
   * Enrichit 1 prospect (score-v2 + persistence). EF `enrich-prospect`.
   */
  async enrichProspect(prospectId: string): Promise<EnrichProspectResult> {
    const { data, error } = await supabase.functions.invoke<EnrichProspectResult>(
      'enrich-prospect',
      { body: { prospectId } },
    )
    if (error) throw error
    if (!data) throw new Error('Réponse vide enrich-prospect')
    return data
  },

  /**
   * Récupère les risques Géorisques d'une commune (avec cache 90j Supabase).
   * EF `georisques-lookup`.
   */
  async georisquesLookup(opts: {
    codeInsee: string
    lat?: number
    lng?: number
  }): Promise<GeorisquesLookupResult> {
    const { data, error } = await supabase.functions.invoke<GeorisquesLookupResult>(
      'georisques-lookup',
      { body: opts },
    )
    if (error) throw error
    if (!data) throw new Error('Réponse vide georisques-lookup')
    return data
  },
}
