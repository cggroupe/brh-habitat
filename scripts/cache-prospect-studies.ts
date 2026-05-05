/**
 * Pre-cache des études prospects (simulateur 8915 → table brh_prospect_studies).
 *
 * Tourne depuis le VPS (accès direct localhost:8915 + psql Supabase).
 * Idempotent — ON CONFLICT update study_json + fetched_at.
 * Parallélisé : concurrency 10 (le simulateur tient ~50 req/s).
 *
 * Usage :
 *   tsx scripts/cache-prospect-studies.ts            # 500 prospects scorés
 *   tsx scripts/cache-prospect-studies.ts --all      # tous les prospects scorés
 *   tsx scripts/cache-prospect-studies.ts --limit=50 # custom
 *   tsx scripts/cache-prospect-studies.ts --skip-cached  # n'overrride pas si déjà en cache
 */

import { Client } from 'pg'

const PG_URL = process.env.BRH_SUPABASE_DB_URL
if (!PG_URL) {
  console.error('❌ BRH_SUPABASE_DB_URL manquant (export depuis /opt/stack/.env)')
  process.exit(1)
}

const SIMULATEUR_URL = process.env.SIMULATEUR_BRH_URL ?? 'http://127.0.0.1:8915'
const argLimit = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
const all = process.argv.includes('--all')
const skipCached = process.argv.includes('--skip-cached')
const LIMIT = all ? null : argLimit ? parseInt(argLimit) : 500
const CONCURRENCY = 10

async function fetchOne(id: number, client: Client): Promise<'ok' | 'fail'> {
  try {
    const res = await fetch(`${SIMULATEUR_URL}/api/prospect/${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    await client.query(
      `INSERT INTO brh_prospect_studies (prospect_id, study_json, fetched_at, source)
       VALUES ($1, $2::jsonb, now(), 'simulateur-8915')
       ON CONFLICT (prospect_id) DO UPDATE
         SET study_json = EXCLUDED.study_json,
             fetched_at = EXCLUDED.fetched_at`,
      [id, JSON.stringify(data)],
    )
    return 'ok'
  } catch {
    return 'fail'
  }
}

async function run(): Promise<void> {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()
  console.log(`Connected to Supabase BRH`)

  // List prospect ids
  const skipFilter = skipCached
    ? `WHERE NOT EXISTS (SELECT 1 FROM brh_prospect_studies s WHERE s.prospect_id = sv.prospect_id)`
    : ''
  const idsRes = await client.query<{ prospect_id: number }>(
    LIMIT
      ? `SELECT sv.prospect_id FROM brh_score_vente_v1 sv ${skipFilter} ORDER BY sv.score DESC NULLS LAST LIMIT $1`
      : `SELECT sv.prospect_id FROM brh_score_vente_v1 sv ${skipFilter} ORDER BY sv.score DESC NULLS LAST`,
    LIMIT ? [LIMIT] : [],
  )
  const ids = idsRes.rows.map((r) => r.prospect_id)
  console.log(`▸ ${ids.length} prospects à fetcher depuis ${SIMULATEUR_URL} (concurrency ${CONCURRENCY})`)

  let ok = 0
  let fail = 0
  const start = Date.now()

  // Worker pool
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < ids.length) {
      const i = cursor++
      const id = ids[i]
      const r = await fetchOne(id, client)
      if (r === 'ok') {
        ok++
        if (ok % 100 === 0) {
          const elapsed = (Date.now() - start) / 1000
          const rate = ok / elapsed
          const eta = (ids.length - ok) / rate
          console.log(
            `  ${ok}/${ids.length} OK · ${rate.toFixed(1)}/s · ETA ${Math.round(eta)}s`,
          )
        }
      } else {
        fail++
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const elapsed = (Date.now() - start) / 1000
  console.log(`\n✅ Cache terminé : ${ok} OK · ${fail} échecs · ${elapsed.toFixed(1)}s`)

  await client.end()
}

run().catch((err) => {
  console.error('❌ Erreur fatale :', err)
  process.exit(1)
})
