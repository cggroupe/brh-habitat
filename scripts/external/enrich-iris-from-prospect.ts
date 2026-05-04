/**
 * Phase 11.1.1 — Assigne `iris_code` aux prospects depuis lat/lng.
 *
 * Source : https://pyris.datajazz.io/api/coords (service public gratuit, IRIS INSEE)
 *
 * Stratégie :
 *   - Liste les prospects avec lat/lng et iris_code IS NULL
 *   - Pour chaque : pyris lookup → assigne `iris_code` + `score_v2_calculated_at` reset
 *   - Throttle 200ms (5 req/s) pour respecter le service public
 *   - Idempotent : peut être relancé
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/enrich-iris-from-prospect.ts [--limit=100] [--dept=29] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PYRIS_URL = 'https://pyris.datajazz.io/api/coords'
const THROTTLE_MS = 200
// Conservé pour compat ; les UPDATEs sont en réalité flushés tous les 50 résolus.
const UPDATE_CHUNK = 200

const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const DEPT = process.argv.find((a) => a.startsWith('--dept='))?.split('=')[1]
const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface PyrisFlat {
  citycode?: string
  complete_code?: string
  iris?: string
}

interface PyrisGeoJson {
  properties?: PyrisFlat
}

async function pyrisLookup(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `${PYRIS_URL}?lat=${lat}&lon=${lon}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as PyrisFlat | PyrisGeoJson
    // Pyris peut renvoyer soit format plat, soit GeoJSON Feature
    const code =
      ('complete_code' in json && json.complete_code) ||
      ('properties' in json && json.properties?.complete_code) ||
      null
    return code && code.length === 9 ? code : null
  } catch {
    return null
  }
}

async function main() {
  console.log(
    `🚀 Phase 11.1.1 — Enrich iris_code (depts: ${DEPT ?? 'all'})${DRY_RUN ? ' [DRY-RUN]' : ''}${LIMIT ? ` [LIMIT=${LIMIT}]` : ''}`,
  )

  // Charge prospects avec lat/lng et sans iris_code
  let q = supabase
    .from('brh_dpe_prospects')
    .select('id, latitude, longitude, departement')
    .is('iris_code', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (DEPT) q = q.eq('departement', DEPT)
  if (LIMIT) q = q.limit(LIMIT)

  const { data: prospects, error } = await q
  if (error) throw error
  if (!prospects || prospects.length === 0) {
    console.log('Aucun prospect à enrichir.')
    return
  }
  console.log(`📊 ${prospects.length} prospects à enrichir`)

  const FLUSH_EVERY = 50
  let pending: Array<{ id: number; iris_code: string }> = []
  let totalResolved = 0
  const totalAttempts = prospects.length

  async function flushPending() {
    if (pending.length === 0 || DRY_RUN) return
    const slice = pending
    pending = []
    // Updates individuels parallèles (préserve les colonnes non touchées)
    await Promise.all(
      slice.map((u) =>
        supabase
          .from('brh_dpe_prospects')
          .update({ iris_code: u.iris_code })
          .eq('id', u.id)
          .then(({ error: uErr }) => {
            if (uErr) console.error(`❌ id=${u.id} :`, uErr.message)
          }),
      ),
    )
  }

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i]
    const lat = Number(p.latitude)
    const lon = Number(p.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    const iris = await pyrisLookup(lat, lon)
    if (iris && iris.length === 9) {
      pending.push({ id: p.id as number, iris_code: iris })
      totalResolved++
    }

    if ((i + 1) % FLUSH_EVERY === 0) {
      await flushPending()
      console.log(`  ${i + 1}/${totalAttempts} (résolus: ${totalResolved})`)
    }
    await sleep(THROTTLE_MS)
  }

  await flushPending()

  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${totalResolved}/${totalAttempts} prospects résolus (non persistés)`)
    return
  }

  console.log(`🎉 Terminé. ${totalResolved}/${totalAttempts} prospects enrichis avec iris_code.`)
  // UPDATE_CHUNK n'est plus utilisé : updates sont flushés au fil de l'eau
  void UPDATE_CHUNK
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
