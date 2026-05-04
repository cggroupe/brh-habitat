/**
 * Pre-cache des études prospects (simulateur 8915 → table brh_prospect_studies).
 *
 * Tourne depuis le VPS (accès direct localhost:8915 + psql Supabase).
 * Idempotent — ON CONFLICT update study_json + fetched_at.
 *
 * Usage :
 *   tsx scripts/cache-prospect-studies.ts            # 500 prospects scorés
 *   tsx scripts/cache-prospect-studies.ts --all      # tous les prospects scorés
 *   tsx scripts/cache-prospect-studies.ts --limit=50 # custom
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
const LIMIT = all ? null : argLimit ? parseInt(argLimit) : 500

async function run(): Promise<void> {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()
  console.log(`Connected to Supabase BRH`)

  // 1. List prospect ids to cache (priorité : score le plus élevé)
  const idsRes = await client.query<{ prospect_id: number }>(
    LIMIT
      ? `SELECT prospect_id FROM brh_score_vente_v1 ORDER BY score DESC NULLS LAST LIMIT $1`
      : `SELECT prospect_id FROM brh_score_vente_v1 ORDER BY score DESC NULLS LAST`,
    LIMIT ? [LIMIT] : [],
  )
  const ids = idsRes.rows.map((r) => r.prospect_id)
  console.log(`▸ ${ids.length} prospects à fetcher depuis ${SIMULATEUR_URL}`)

  let ok = 0
  let fail = 0
  const errors: string[] = []

  // 2. Fetch each + upsert
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
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
      ok++
      if (ok % 50 === 0) console.log(`  ${ok} / ${ids.length} OK`)
    } catch (err) {
      fail++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`prospect ${id}: ${msg}`)
      if (fail <= 5) console.warn(`  ✗ prospect ${id}: ${msg}`)
    }
  }

  console.log(`\n✅ Cache terminé : ${ok} OK · ${fail} échecs`)
  if (errors.length > 5) {
    console.log(`(${errors.length} erreurs au total — ${errors.length - 5} masquées)`)
  }

  await client.end()
}

run().catch((err) => {
  console.error('❌ Erreur fatale :', err)
  process.exit(1)
})
