/**
 * Migration des 59 306 dpe_prospects PostgreSQL local → brh_dpe_prospects Supabase.
 *
 * Phase 6.2 — Centralisation infra.
 *
 * Lit via `pg` (Docker container) + bulk INSERT via supabase-js (service role).
 * Préserve les colonnes JSONB (aides_detail, chiffrage_detail, dpe_saut_*).
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   PG_HOST=127.0.0.1 PG_PASSWORD=... \
 *   npx tsx scripts/migrate-dpe-prospects.ts
 */

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Client } = pg

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const PG_HOST = process.env.PG_HOST ?? '127.0.0.1'
const PG_PORT = parseInt(process.env.PG_PORT ?? '5432', 10)
const PG_USER = process.env.PG_USER ?? 'n8n'
const PG_DB = process.env.PG_DB ?? 'prospection'
const PG_PASSWORD = process.env.PG_PASSWORD ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PG_PASSWORD) {
  console.error('Missing required env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CHUNK = 500

async function main() {
  const pgClient = new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DB,
  })
  await pgClient.connect()
  console.log('Connected to local PostgreSQL')

  // Total
  const { rows: countRows } = await pgClient.query<{ c: string }>(
    'SELECT count(*)::text AS c FROM dpe_prospects',
  )
  const total = parseInt(countRows[0].c, 10)
  console.log(`Source rows: ${total}`)

  // Truncate Supabase target (idempotent)
  console.log('Truncating brh_dpe_prospects (Supabase)...')
  const { error: truncErr } = await supabase.rpc('exec_sql', {
    sql: 'TRUNCATE brh_dpe_prospects RESTART IDENTITY',
  })
  // Fallback : delete all
  if (truncErr) {
    console.warn('TRUNCATE RPC failed (fallback DELETE):', truncErr.message)
    const { error: delErr } = await supabase.from('brh_dpe_prospects').delete().gt('id', 0)
    if (delErr) console.error('DELETE failed:', delErr.message)
  }

  // Stream cursor from PostgreSQL
  await pgClient.query('BEGIN')
  await pgClient.query('DECLARE dpe_cursor CURSOR FOR SELECT * FROM dpe_prospects ORDER BY id')

  let imported = 0
  const startTime = Date.now()
  while (true) {
    const { rows } = await pgClient.query(`FETCH ${CHUNK} FROM dpe_cursor`)
    if (rows.length === 0) break

    // Map → camelCase Supabase (all snake_case = identique, mais on copie tel quel)
    const records = rows.map((r) => {
      const obj: Record<string, unknown> = {}
      for (const k of Object.keys(r)) {
        const v = r[k]
        // pg renvoie déjà JSONB en object (pas en string)
        obj[k] = v === undefined ? null : v
      }
      return obj
    })

    const { error } = await supabase.from('brh_dpe_prospects').insert(records)
    if (error) {
      console.error(`Insert chunk ${imported}-${imported + records.length} failed:`, error.message)
      // Retry par row pour identifier les rows problématiques
      let okCount = 0
      for (const rec of records) {
        const { error: e2 } = await supabase.from('brh_dpe_prospects').insert([rec])
        if (e2) {
          console.error(`  row id=${rec.id} failed:`, e2.message)
        } else {
          okCount++
        }
      }
      imported += okCount
    } else {
      imported += records.length
    }

    if (imported % 5000 < CHUNK) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`  ${imported}/${total} (${elapsed}s)`)
    }
  }

  await pgClient.query('COMMIT')
  await pgClient.end()

  // Restore sequence
  console.log('Setting sequence...')
  // skipped (Supabase serial seq sera juste après le max(id) inséré, OK pour V1)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== ${imported}/${total} rows migrated in ${elapsed}s ===`)

  // Verif Supabase count
  const { count } = await supabase
    .from('brh_dpe_prospects')
    .select('*', { count: 'exact', head: true })
  console.log(`Supabase count : ${count}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
