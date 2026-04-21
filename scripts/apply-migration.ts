/**
 * Applique une migration SQL directement via pg + pooler Supabase.
 * Usage : tsx scripts/apply-migration.ts <path-to-sql-file>
 * Le pooler URL (avec password) est lu depuis supabase/.temp/pooler-url
 * Ne jamais logger le pooler URL.
 */

import pg from 'pg'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage : tsx scripts/apply-migration.ts <path-to-sql-file>')
  process.exit(1)
}

const sqlPath = migrationFile.startsWith('/') ? migrationFile : join(ROOT, migrationFile)
if (!existsSync(sqlPath)) {
  console.error(`Fichier introuvable : ${sqlPath}`)
  process.exit(1)
}

const poolerUrlPath = join(ROOT, 'supabase', '.temp', 'pooler-url')
if (!existsSync(poolerUrlPath)) {
  console.error('supabase/.temp/pooler-url introuvable. Lance `supabase link` d\'abord.')
  process.exit(1)
}
const poolerUrl = readFileSync(poolerUrlPath, 'utf8').trim()

const sql = readFileSync(sqlPath, 'utf8')
console.log(`\n📄 Migration : ${sqlPath}`)
console.log(`─── SQL a appliquer ───────────────────`)
console.log(sql)
console.log(`───────────────────────────────────────\n`)

const client = new pg.Client({ connectionString: poolerUrl })

try {
  await client.connect()
  console.log(`🔌 Connecte au pooler Supabase`)

  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')

  console.log(`✅ Migration appliquee avec succes`)
} catch (err) {
  try { await client.query('ROLLBACK') } catch { /* ignore */ }
  console.error(`❌ Erreur : ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
} finally {
  await client.end()
}
