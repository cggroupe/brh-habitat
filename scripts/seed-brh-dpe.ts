/**
 * Seed des 44 tables référentielles brh_dpe_*
 * Source : caprenov-reverse/db_dumps/tv/*.csv
 *
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/seed-brh-dpe.ts
 *
 * Idempotent : TRUNCATE + INSERT pour chaque table.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const CSV_DIR = '/root/projects/site-claude-code/caprenov-reverse/db_dumps/tv'

// Mapping CSV filename → table name + flag (whether to skip first column tv_*_id)
const MAPPINGS: Array<{ csv: string; table: string; keepIdCol?: boolean }> = [
  { csv: 'umur', table: 'brh_dpe_umur' },
  { csv: 'umur0', table: 'brh_dpe_umur0' },
  { csv: 'upb', table: 'brh_dpe_upb' },
  { csv: 'upb0', table: 'brh_dpe_upb0' },
  { csv: 'uph', table: 'brh_dpe_uph' },
  { csv: 'uph0', table: 'brh_dpe_uph0' },
  { csv: 'ug', table: 'brh_dpe_ug' },
  { csv: 'uw', table: 'brh_dpe_uw' },
  { csv: 'sw', table: 'brh_dpe_sw' },
  { csv: 'ujn', table: 'brh_dpe_ujn' },
  { csv: 'uporte', table: 'brh_dpe_uporte' },
  { csv: 'uvue', table: 'brh_dpe_uvue' },
  { csv: 'ue', table: 'brh_dpe_ue' },
  { csv: 'deltar', table: 'brh_dpe_deltar' },
  { csv: 'coef_reduction_deperdition', table: 'brh_dpe_coef_reduction_deperdition' },
  { csv: 'coef_reduction_deperdition_lnc', table: 'brh_dpe_coef_reduction_deperdition_lnc' },
  { csv: 'coef_reduction_deperdition_ets', table: 'brh_dpe_coef_reduction_deperdition_ets' },
  { csv: 'coef_reduction_deperdition_copi', table: 'brh_dpe_coef_reduction_deperdition_copi' },
  { csv: 'coef_transparence_ets', table: 'brh_dpe_coef_transparence_ets' },
  { csv: 'pont_thermique', table: 'brh_dpe_pont_thermique' },
  { csv: 'coef_masque_proche', table: 'brh_dpe_coef_masque_proche' },
  { csv: 'coef_masque_lointain_homogene', table: 'brh_dpe_coef_masque_lointain_homogene' },
  { csv: 'coef_masque_lointain_non_homoge', table: 'brh_dpe_coef_masque_lointain_non_homogene' },
  { csv: 'q4pa_conv', table: 'brh_dpe_q4pa_conv' },
  { csv: 'debits_ventilation', table: 'brh_dpe_debits_ventilation' },
  { csv: 'rendement_emission', table: 'brh_dpe_rendement_emission' },
  { csv: 'rendement_distribution_ch', table: 'brh_dpe_rendement_distribution_ch' },
  { csv: 'rendement_distribution_ecs', table: 'brh_dpe_rendement_distribution_ecs' },
  { csv: 'rendement_regulation', table: 'brh_dpe_rendement_regulation' },
  { csv: 'rendement_generation', table: 'brh_dpe_rendement_generation' },
  { csv: 'generateur_combustion', table: 'brh_dpe_generateur_combustion' },
  { csv: 'temp_fonc_30', table: 'brh_dpe_temp_fonc_30' },
  { csv: 'temp_fonc_100', table: 'brh_dpe_temp_fonc_100' },
  { csv: 'scop_ch', table: 'brh_dpe_scop_ch' },
  { csv: 'scop_ecs', table: 'brh_dpe_scop_ecs' },
  { csv: 'seer', table: 'brh_dpe_seer' },
  { csv: 'pertes_stockage', table: 'brh_dpe_pertes_stockage' },
  { csv: 'intermittence', table: 'brh_dpe_intermittence' },
  { csv: 'facteur_couverture_solaire', table: 'brh_dpe_facteur_couverture_solaire' },
  { csv: 'coef_orientation_pv', table: 'brh_dpe_coef_orientation_pv' },
  { csv: 'reseau_chaleur_2020', table: 'brh_dpe_reseau_chaleur_2020' },
  // Les CSV 2021/2022 commencent par identifiant_reseau (pas tv_*_id) — keepIdCol pour ne pas drop
  { csv: 'reseau_chaleur_2021', table: 'brh_dpe_reseau_chaleur_2021', keepIdCol: true },
  { csv: 'reseau_chaleur_2022', table: 'brh_dpe_reseau_chaleur_2022', keepIdCol: true },
]

/**
 * Parse CSV with proper handling of quoted values (RFC 4180).
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }

    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      current.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      current.push(field)
      if (current.length > 1 || current[0] !== '') rows.push(current)
      current = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  if (field !== '' || current.length > 0) {
    current.push(field)
    rows.push(current)
  }
  return rows
}

/**
 * Convert string value to typed value (number / null / string).
 * Drop empty strings as null.
 */
function coerceValue(s: string): string | number | null {
  if (s === '' || s === 'NaN' || s === 'nan') return null
  // Try numeric (int or float)
  if (/^-?\d+$/.test(s)) return parseInt(s, 10)
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s)
  return s
}

async function seedTable(
  supabase: ReturnType<typeof createClient>,
  csvName: string,
  tableName: string,
  keepIdCol = false,
): Promise<{ table: string; rows: number; ok: boolean; error?: string }> {
  const csvPath = resolve(CSV_DIR, `${csvName}.csv`)
  const text = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(text)
  if (rows.length === 0) return { table: tableName, rows: 0, ok: false, error: 'Empty CSV' }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Drop first column (tv_*_id) — we have SERIAL on Supabase side (sauf si keepIdCol=true)
  if (!keepIdCol) {
    const idCol = headers[0]
    if (!idCol.startsWith('tv_') || !idCol.endsWith('_id')) {
      return { table: tableName, rows: 0, ok: false, error: `First col is not tv_*_id: ${idCol}` }
    }
  }

  const startIdx = keepIdCol ? 0 : 1
  const allCols = headers.slice(startIdx)
  const targetCols = allCols.filter((h) => !h.startsWith('Unnamed:') && h !== '')
  const targetIdx = allCols
    .map((h, i) => (h.startsWith('Unnamed:') || h === '' ? -1 : i + startIdx))
    .filter((i) => i >= 0)

  // TRUNCATE pour idempotence (RESTART IDENTITY pour reset SERIAL)
  // On utilise un RPC ou DELETE si pas de RPC
  const { error: deleteError } = await supabase.from(tableName).delete().neq('id', -1)
  if (deleteError) {
    return { table: tableName, rows: 0, ok: false, error: `Delete failed: ${deleteError.message}` }
  }

  // Build records
  const records = dataRows.map((row) => {
    const obj: Record<string, unknown> = {}
    targetCols.forEach((col, idx) => {
      const srcIdx = targetIdx[idx]
      obj[col] = coerceValue(row[srcIdx] ?? '')
    })
    return obj
  })

  // Insert by chunks of 500 (Supabase limit + safety)
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase.from(tableName).insert(chunk)
    if (error) {
      return {
        table: tableName,
        rows: inserted,
        ok: false,
        error: `Insert failed at chunk ${i}: ${error.message}`,
      }
    }
    inserted += chunk.length
    if (records.length > 5000 && i % 5000 === 0 && i > 0) {
      console.log(`    ${tableName}: ${inserted}/${records.length}`)
    }
  }

  return { table: tableName, rows: inserted, ok: true }
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Seeding ${MAPPINGS.length} tables from ${CSV_DIR}\n`)

  const results: Awaited<ReturnType<typeof seedTable>>[] = []
  let totalRows = 0
  const startTotal = Date.now()

  for (const m of MAPPINGS) {
    const start = Date.now()
    process.stdout.write(`  ${m.table.padEnd(50)} `)
    const result = await seedTable(supabase, m.csv, m.table, m.keepIdCol ?? false)
    results.push(result)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    if (result.ok) {
      console.log(`OK ${result.rows.toString().padStart(6)} rows (${elapsed}s)`)
      totalRows += result.rows
    } else {
      console.log(`FAIL — ${result.error}`)
    }
  }

  const totalElapsed = ((Date.now() - startTotal) / 1000).toFixed(1)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n=== ${results.length - failed.length}/${results.length} tables seeded — ${totalRows} rows total — ${totalElapsed}s ===`)

  if (failed.length > 0) {
    console.error('\nFailures:')
    failed.forEach((r) => console.error(`  ${r.table}: ${r.error}`))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
