/**
 * Phase 11.1.1 — Calcule score_v2 pour les ~59 306 prospects DPE F/G Bretagne.
 *
 * Stratégie : batch côté Node (réutilise computeScoreV2 du module front).
 *   - Pas d'EF (rate limit 20/min/IP trop bas pour 59k).
 *   - Lit les prospects par pages 1000.
 *   - Joint IRIS + commune en mémoire (cache local).
 *   - Calcule score-v2 + breakdown.
 *   - UPDATE par batch 200 via supabase-js (service_role, RLS bypass).
 *   - Idempotent : peut être relancé n'importe quand.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/batch-score-v2-all.ts [--limit=100] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import {
  computeScoreV2,
  type ScoreV2Input,
} from '../../src/lib/dpe-engine/external'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PAGE = 1000

const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const DRY_RUN = process.argv.includes('--dry-run')

// ============================================================================
// Caches locaux IRIS + commune
// ============================================================================
async function loadIrisCache(): Promise<Map<string, ScoreV2Input['iris']>> {
  console.log('📥 Chargement brh_ext_iris…')
  const map = new Map<string, ScoreV2Input['iris']>()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('brh_ext_iris')
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      map.set(row.iris_code as string, row as unknown as ScoreV2Input['iris'])
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  console.log(`✅ ${map.size} IRIS en cache local`)
  return map
}

async function loadCommuneCache(): Promise<Map<string, ScoreV2Input['commune']>> {
  console.log('📥 Chargement brh_ext_commune…')
  const map = new Map<string, ScoreV2Input['commune']>()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('brh_ext_commune')
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      map.set(row.insee as string, row as unknown as ScoreV2Input['commune'])
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  console.log(`✅ ${map.size} communes en cache local`)
  return map
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`🚀 Phase 11.1.1 — Batch score_v2${DRY_RUN ? ' [DRY-RUN]' : ''}${LIMIT ? ` [LIMIT=${LIMIT}]` : ''}`)

  const irisCache = await loadIrisCache()
  const communeCache = await loadCommuneCache()

  // Compte total
  const { count, error: cErr } = await supabase
    .from('brh_dpe_prospects')
    .select('*', { count: 'exact', head: true })
  if (cErr) throw cErr
  const total = LIMIT > 0 ? Math.min(count ?? 0, LIMIT) : count ?? 0
  console.log(`📊 Total prospects à scorer : ${total}`)

  let processed = 0
  let from = 0

  while (processed < total) {
    const pageSize = Math.min(PAGE, total - processed)
    const { data: prospects, error } = await supabase
      .from('brh_dpe_prospects')
      .select('id, etiquette_dpe, has_pv_36kw, iris_code')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!prospects || prospects.length === 0) break

    const updates: Array<{
      id: number
      score_v2: number
      score_v2_segment: string
      score_v2_detail: unknown
      score_v2_calculated_at: string
    }> = []

    for (const p of prospects) {
      const irisCode = (p.iris_code as string | null) ?? null
      const inseeFromIris = irisCode ? irisCode.slice(0, 5) : null

      const iris = irisCode ? irisCache.get(irisCode) ?? null : null
      const commune = inseeFromIris ? communeCache.get(inseeFromIris) ?? null : null

      const breakdown = computeScoreV2({
        prospect: {
          id: String(p.id),
          etiquette_dpe: (p.etiquette_dpe as string | null) ?? null,
          has_pv_36kw: (p.has_pv_36kw as boolean | null) ?? false,
        },
        iris,
        commune,
        risques: commune?.rga_alea ? { rga_local: commune.rga_alea } : null,
        dvf: null,
        enedisAddr: null,
      })

      updates.push({
        id: p.id as number,
        score_v2: breakdown.total,
        score_v2_segment: breakdown.segment,
        score_v2_detail: breakdown,
        score_v2_calculated_at: new Date().toISOString(),
      })
    }

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Sample :`, updates.slice(0, 2))
    } else {
      // Updates individuels pour préserver les autres colonnes (upsert essaie INSERT et casse).
      const PARALLEL = 10
      for (let i = 0; i < updates.length; i += PARALLEL) {
        const slice = updates.slice(i, i + PARALLEL)
        await Promise.all(
          slice.map((u) =>
            supabase
              .from('brh_dpe_prospects')
              .update({
                score_v2: u.score_v2,
                score_v2_segment: u.score_v2_segment,
                score_v2_detail: u.score_v2_detail,
                score_v2_calculated_at: u.score_v2_calculated_at,
              })
              .eq('id', u.id)
              .then(({ error: uErr }) => {
                if (uErr) console.error(`❌ id=${u.id} :`, uErr.message)
              }),
          ),
        )
      }
    }

    processed += prospects.length
    from += prospects.length
    console.log(`✅ ${processed}/${total}`)
  }

  console.log(`\n🎉 Terminé. ${processed} prospects scorés.`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
