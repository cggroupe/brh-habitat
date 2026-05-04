/**
 * API pro-analytics — Phase 14.
 *
 * KPIs + funnel + trends pour le dashboard analytique pro.
 * Pair volontaire avec hooks/queries/pro-analytics.ts.
 */

import { supabase } from '@/lib/supabase'
import type { ScoreV2Segment } from '@/lib/dpe-engine/external/types'

export interface AnalyticsOverview {
  /** Compteurs scoring v2 par segment (toutes données BZH). */
  segments: Record<ScoreV2Segment, number>
  /** Total prospects scorés (segments != null). */
  totalScored: number
  /** Total prospects avec iris_code (Pyris enriched). */
  totalEnriched: number
  /** Total prospects avec dvf_mutation_24m. */
  totalDvfRecent: number
}

export interface AnalyticsAides {
  /** Somme MPR Bleu sur ultra-chauds + bleu_prio. */
  mprBleuTotalEur: number
  /** Somme MPR Jaune. */
  mprJauneTotalEur: number
  /** Somme MPR Violet. */
  mprVioletTotalEur: number
  /** Somme CEE. */
  ceeTotalEur: number
  /** Somme grand total des aides identifiées. */
  grandTotalEur: number
  /** Nombre de prospects avec MPR Bleu éligible. */
  countMprBleu: number
}

export interface AnalyticsLetters {
  total: number
  thisWeek: number
  draft: number
  edited: number
  sent: number
  costEstimateEur: number
  cacheHitRate: number
  /** Trend 7 derniers jours (samples journaliers). */
  trend7d: Array<{ date: string; count: number }>
}

export interface AnalyticsTopProspect {
  id: number
  commune: string | null
  etiquette: string | null
  score: number
  segment: ScoreV2Segment | null
  mpr_bleu_total: number | null
  mpr_jaune_total: number | null
  mpr_violet_total: number | null
}

export const proAnalyticsApi = {
  /**
   * KPIs scoring globaux (BZH 59k).
   */
  async overview(): Promise<AnalyticsOverview> {
    const segments: ScoreV2Segment[] = [
      'ultra_chaud',
      'mpr_bleu_prio',
      'premium',
      'standard',
      'cold',
    ]
    const segCounts: Record<ScoreV2Segment, number> = {
      ultra_chaud: 0,
      mpr_bleu_prio: 0,
      premium: 0,
      standard: 0,
      cold: 0,
    }

    const [scoredRes, irisRes, dvfRes, ...segRes] = await Promise.all([
      supabase
        .from('brh_dpe_prospects')
        .select('id', { count: 'exact', head: true })
        .not('score_v2', 'is', null),
      supabase
        .from('brh_dpe_prospects')
        .select('id', { count: 'exact', head: true })
        .not('iris_code', 'is', null),
      supabase
        .from('brh_dpe_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('dvf_mutation_24m', true),
      ...segments.map((seg) =>
        supabase
          .from('brh_dpe_prospects')
          .select('id', { count: 'exact', head: true })
          .eq('score_v2_segment', seg),
      ),
    ])

    segments.forEach((seg, i) => {
      segCounts[seg] = segRes[i].count ?? 0
    })

    return {
      segments: segCounts,
      totalScored: scoredRes.count ?? 0,
      totalEnriched: irisRes.count ?? 0,
      totalDvfRecent: dvfRes.count ?? 0,
    }
  },

  /**
   * Aides MPR/CEE potentielles (somme sur prospects scorés segments chauds).
   */
  async aides(): Promise<AnalyticsAides> {
    // Charge en pages 1000 les colonnes aides des prospects ultra-chauds + bleu_prio + premium
    const targets: ScoreV2Segment[] = ['ultra_chaud', 'mpr_bleu_prio', 'premium']
    const acc: AnalyticsAides = {
      mprBleuTotalEur: 0,
      mprJauneTotalEur: 0,
      mprVioletTotalEur: 0,
      ceeTotalEur: 0,
      grandTotalEur: 0,
      countMprBleu: 0,
    }

    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('brh_dpe_prospects')
        .select('mpr_bleu_total,mpr_jaune_total,mpr_violet_total,cee_total,score_v2_segment')
        .in('score_v2_segment', targets)
        .range(from, from + 999)
      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const bleu = Number(row.mpr_bleu_total) || 0
        const jaune = Number(row.mpr_jaune_total) || 0
        const violet = Number(row.mpr_violet_total) || 0
        const cee = Number(row.cee_total) || 0
        acc.mprBleuTotalEur += bleu
        acc.mprJauneTotalEur += jaune
        acc.mprVioletTotalEur += violet
        acc.ceeTotalEur += cee
        if (bleu > 0) acc.countMprBleu++
      }

      if (data.length < 1000) break
      from += 1000
    }

    acc.grandTotalEur = acc.mprBleuTotalEur + acc.mprJauneTotalEur + acc.mprVioletTotalEur + acc.ceeTotalEur
    return acc
  },

  /**
   * Phase 14.1 — Fetch USD/EUR rate live (ECB via frankfurter.app, cache 24h serveur).
   */
  async fetchUsdEurRate(): Promise<{ rate: number; date: string; source: string }> {
    const { data, error } = await supabase.functions.invoke<{
      rate: number
      date: string
      source: string
    }>('fetch-fx-rate', { body: { from: 'USD', to: 'EUR' } })
    if (error) throw error
    return data ?? { rate: 0.92, date: '2024-01-01', source: 'fallback' }
  },

  /**
   * Stats courriers IA (cost monitoring + funnel).
   * @param usdEurRate Taux USD→EUR à utiliser (par défaut 0.92, peut être passé live via fetchUsdEurRate)
   */
  async letters(usdEurRate = 0.92): Promise<AnalyticsLetters> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoIso = sevenDaysAgo.toISOString()

    const [allRes, weekRes] = await Promise.all([
      supabase
        .from('brh_prospect_letters')
        .select('status,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,created_at'),
      supabase
        .from('brh_prospect_letters')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoIso),
    ])

    const all = (allRes.data ?? []) as Array<{
      status: string
      input_tokens: number | null
      output_tokens: number | null
      cache_read_tokens: number | null
      cache_creation_tokens: number | null
      created_at: string
    }>

    const acc: AnalyticsLetters = {
      total: all.length,
      thisWeek: weekRes.count ?? 0,
      draft: 0,
      edited: 0,
      sent: 0,
      costEstimateEur: 0,
      cacheHitRate: 0,
      trend7d: [],
    }

    let totalCacheRead = 0
    let totalInputUncached = 0
    for (const row of all) {
      if (row.status === 'draft') acc.draft++
      else if (row.status === 'edited') acc.edited++
      else if (row.status === 'sent') acc.sent++

      // Coût Opus 4.7 : input $5/M, output $25/M, cache_read $0.5/M, cache_write $6.25/M
      // Conversion EUR ≈ * 0.92
      const input = row.input_tokens ?? 0
      const output = row.output_tokens ?? 0
      const cacheRead = row.cache_read_tokens ?? 0
      const cacheCreation = row.cache_creation_tokens ?? 0

      const cost =
        ((input * 5) / 1_000_000 +
          (output * 25) / 1_000_000 +
          (cacheRead * 0.5) / 1_000_000 +
          (cacheCreation * 6.25) / 1_000_000) *
        usdEurRate
      acc.costEstimateEur += cost
      totalCacheRead += cacheRead
      totalInputUncached += input
    }

    acc.cacheHitRate =
      totalCacheRead + totalInputUncached > 0
        ? totalCacheRead / (totalCacheRead + totalInputUncached)
        : 0

    // Trend 7 derniers jours
    const buckets: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      buckets[key] = 0
    }
    for (const row of all) {
      const d = new Date(row.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (key in buckets) buckets[key]++
    }
    acc.trend7d = Object.entries(buckets).map(([date, count]) => ({ date, count }))

    return acc
  },

  /**
   * Top 10 prospects ultra-chauds par score DESC.
   */
  async topProspects(limit = 10): Promise<AnalyticsTopProspect[]> {
    const { data, error } = await supabase
      .from('brh_dpe_prospects')
      .select('id,commune,etiquette_dpe,score_v2,score_v2_segment,mpr_bleu_total,mpr_jaune_total,mpr_violet_total')
      .not('score_v2', 'is', null)
      .order('score_v2', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id as number,
      commune: r.commune as string | null,
      etiquette: r.etiquette_dpe as string | null,
      score: r.score_v2 as number,
      segment: r.score_v2_segment as ScoreV2Segment | null,
      mpr_bleu_total: r.mpr_bleu_total as number | null,
      mpr_jaune_total: r.mpr_jaune_total as number | null,
      mpr_violet_total: r.mpr_violet_total as number | null,
    }))
  },
}
