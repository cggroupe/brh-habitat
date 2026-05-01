/**
 * Phase 11.2.1 — Enrichissement DVF des prospects DPE F/G Bretagne.
 *
 * Pour chaque commune BZH avec prospects :
 *   1. Download les CSV DVF 2024+2025+2026 (data.gouv flat-files)
 *   2. Cache local data/dvf-cache/{annee}/{insee}.csv (idempotent)
 *   3. Parse + match parcelles via Haversine 30m sur lat/lng prospects
 *   4. UPDATE prospects : dvf_mutation_24m + dvf_date + dvf_prix_m2
 *   5. UPDATE brh_ext_commune : prix_m2_median_3y + prix_m2_growth_3y + dvf_last_refresh
 *
 * Idempotent : peut être relancé n'importe quand. CSV cachés.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/enrich-dvf-bretagne.ts [--dept=29] [--limit-communes=20]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  parseDvfRow,
  haversineMeters,
  isMutationRecent,
  aggregatePriceMedian3y,
  buildDvfUrl,
  type DvfMutation,
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

const BZH_DEPTS = ['22', '29', '35', '56']
const ANNEES = [2024, 2025, 2026]
const TOLERANCE_M = 30
const MUTATION_WINDOW_MONTHS = 24
const CACHE_DIR = resolve(process.cwd(), 'data/dvf-cache')
const THROTTLE_DOWNLOAD_MS = 100

const argDept = process.argv.find((a) => a.startsWith('--dept='))?.split('=')[1]
const LIMIT_COMMUNES = Number(
  process.argv.find((a) => a.startsWith('--limit-communes='))?.split('=')[1] ?? 0,
)
const DEPTS = argDept ? [argDept] : BZH_DEPTS

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ============================================================================
// Download CSV DVF avec cache local
// ============================================================================
async function fetchDvfCsv(annee: number, insee: string): Promise<string | null> {
  const dir = resolve(CACHE_DIR, String(annee))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const file = resolve(dir, `${insee}.csv`)
  if (existsSync(file)) return readFileSync(file, 'utf-8')

  try {
    const url = buildDvfUrl({ annee, codeInsee: insee })
    const res = await fetch(url)
    if (!res.ok) {
      // 404 fréquent (commune sans mutation l'année donnée) — cache empty
      writeFileSync(file, '')
      return ''
    }
    const text = await res.text()
    writeFileSync(file, text)
    return text
  } catch (err) {
    console.warn(`⚠️  DVF download ${annee}/${insee}:`, err)
    return null
  }
}

function parseDvfCsv(csv: string): DvfMutation[] {
  if (!csv || csv.length < 20) return []
  const lines = csv.split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  const out: DvfMutation[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const m = parseDvfRow(headers, cols)
    if (m) out.push(m)
  }
  return out
}

// ============================================================================
// Aggrège mutations 3y commune → prix_m2_median + growth
// ============================================================================
function computeCommuneAgg(mutations: DvfMutation[]): {
  prix_m2_median_3y: number | null
  prix_m2_growth_3y: number | null
} {
  return aggregatePriceMedian3y(mutations)
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(
    `🚀 Phase 11.2.1 — Enrich DVF Bretagne (depts: ${DEPTS.join(',')})${LIMIT_COMMUNES ? ` [LIMIT_COMMUNES=${LIMIT_COMMUNES}]` : ''}`,
  )

  // 1. Récupère liste communes Bretagne uniques depuis prospects
  const { data: communesRows, error: cErr } = await supabase
    .from('brh_dpe_prospects')
    .select('commune, departement')
    .in('departement', DEPTS)
    .not('commune', 'is', null)
    .limit(60_000)
  if (cErr) throw cErr

  // Dedupe + récupère INSEE via prospects.iris_code (s'il y en a) ou via geo.api.gouv.fr
  type Comm = { insee: string; dept: string }
  const seen = new Set<string>()
  const communes: Comm[] = []

  // On récupère la liste INSEE depuis brh_ext_commune (déjà seedé Phase 11.1.2)
  // Pagination 1000 (limite Supabase REST par défaut)
  let from = 0
  while (true) {
    const { data: extCommunes, error: eErr } = await supabase
      .from('brh_ext_commune')
      .select('insee')
      .range(from, from + 999)
    if (eErr) throw eErr
    if (!extCommunes || extCommunes.length === 0) break
    for (const r of extCommunes) {
      const ins = r.insee as string
      const dept = ins.startsWith('97') ? ins.slice(0, 3) : ins.slice(0, 2)
      if (!DEPTS.includes(dept)) continue
      if (seen.has(ins)) continue
      seen.add(ins)
      communes.push({ insee: ins, dept })
    }
    if (extCommunes.length < 1000) break
    from += 1000
  }

  if (LIMIT_COMMUNES > 0) communes.splice(LIMIT_COMMUNES)
  console.log(`📋 ${communes.length} communes à enrichir`)
  void communesRows

  let totalDownloads = 0
  let totalProspectsUpdated = 0

  for (let ci = 0; ci < communes.length; ci++) {
    const c = communes[ci]

    // Download CSV DVF 3 années
    const allMutations: DvfMutation[] = []
    for (const annee of ANNEES) {
      const csv = await fetchDvfCsv(annee, c.insee)
      if (csv == null) continue
      totalDownloads++
      allMutations.push(...parseDvfCsv(csv))
      await sleep(THROTTLE_DOWNLOAD_MS)
    }

    if (allMutations.length === 0) {
      // Commune sans mutation : on UPDATE quand même dvf_last_refresh
      await supabase
        .from('brh_ext_commune')
        .update({ dvf_last_refresh: new Date().toISOString() })
        .eq('insee', c.insee)
      if ((ci + 1) % 25 === 0) console.log(`  ${ci + 1}/${communes.length} (${c.insee}) — 0 muts`)
      continue
    }

    // 2. Aggrège commune (médiane prix m² + growth 3y)
    const agg = computeCommuneAgg(allMutations)
    await supabase
      .from('brh_ext_commune')
      .update({
        prix_m2_median_3y: agg.prix_m2_median_3y,
        prix_m2_growth_3y: agg.prix_m2_growth_3y,
        dvf_last_refresh: new Date().toISOString(),
      })
      .eq('insee', c.insee)

    // 3. Charge prospects de cette commune (via prefix iris_code)
    const { data: prospects, error: pErr } = await supabase
      .from('brh_dpe_prospects')
      .select('id, latitude, longitude')
      .like('iris_code', `${c.insee}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (pErr) {
      console.warn(`⚠️  prospects ${c.insee}:`, pErr.message)
      continue
    }
    if (!prospects || prospects.length === 0) {
      if ((ci + 1) % 25 === 0)
        console.log(`  ${ci + 1}/${communes.length} (${c.insee}) — ${allMutations.length} muts, 0 prospects`)
      continue
    }

    // 4. Match Haversine
    const updates: Array<{ id: number; dvf_mutation_24m: boolean; dvf_date: string }> = []
    const now = new Date()
    for (const p of prospects) {
      const lat = Number(p.latitude)
      const lon = Number(p.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

      let matched: DvfMutation | null = null
      for (const m of allMutations) {
        if (!isMutationRecent(m.date_mutation, MUTATION_WINDOW_MONTHS, now)) continue
        if (m.latitude == null || m.longitude == null) continue
        if (m.code_type_local !== 1 && m.code_type_local !== 2) continue
        const dist = haversineMeters({ lat, lng: lon }, { lat: m.latitude, lng: m.longitude })
        if (dist <= TOLERANCE_M) {
          matched = m
          break
        }
      }
      if (matched) {
        updates.push({
          id: p.id as number,
          dvf_mutation_24m: true,
          dvf_date: matched.date_mutation,
        })
      }
    }

    // 5. Persiste updates en parallèle
    if (updates.length > 0) {
      await Promise.all(
        updates.map((u) =>
          supabase
            .from('brh_dpe_prospects')
            .update({
              dvf_mutation_24m: u.dvf_mutation_24m,
              dvf_date: u.dvf_date,
            })
            .eq('id', u.id)
            .then(({ error: uErr }) => {
              if (uErr) console.error(`❌ id=${u.id}:`, uErr.message)
            }),
        ),
      )
      totalProspectsUpdated += updates.length
    }

    if ((ci + 1) % 25 === 0 || updates.length > 0) {
      console.log(
        `  ${ci + 1}/${communes.length} (${c.insee}) — ${allMutations.length} muts, ${prospects.length} prosp, ${updates.length} matches`,
      )
    }
  }

  console.log(`\n🎉 Terminé.`)
  console.log(`   - ${totalDownloads} fichiers DVF téléchargés/utilisés`)
  console.log(`   - ${totalProspectsUpdated} prospects avec dvf_mutation_24m=true`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
