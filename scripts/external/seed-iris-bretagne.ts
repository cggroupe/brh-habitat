/**
 * Phase 11.1.1 — Seed brh_ext_iris pour les 4 départements bretons (22, 29, 35, 56).
 *
 * Sources :
 *   - Enedis Opendatasoft (thermosensibilité IRIS, conso résid agrégée) — API publique sans clé
 *   - GRDF Opendatasoft (conso gaz IRIS, PDL résidentiels)             — API publique sans clé
 *   - INSEE Filosofi 2021 (médiane revenu UC, déciles)                 — CSV manuel (data/filosofi-iris-2021.csv)
 *   - INSEE Recensement Logement 2022 (tx_proprio, tx_avant_1975)      — CSV manuel (data/recensement-logement-iris-2022.csv)
 *
 * Stratégie idempotente : UPSERT par `iris_code`, jamais de DELETE.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/seed-iris-bretagne.ts [--dept=29] [--dry-run]
 *
 * Sans `--dept`, traite les 4 départements bretons en séquence.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import {
  estimateDecile,
  decileToCouleurMpr,
  parseGrdfIrisSignal,
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
const CHUNK = 500

const argDept = process.argv.find((a) => a.startsWith('--dept='))?.split('=')[1]
const DRY_RUN = process.argv.includes('--dry-run')
const DEPTS = argDept ? [argDept] : BZH_DEPTS

interface IrisRecord {
  iris_code: string
  commune_insee: string
  med21: number | null
  d121: number | null
  d921: number | null
  decile_estime: number | null
  couleur_mpr: 'bleu' | 'jaune' | 'violet' | 'rose' | null
  tx_proprio: number | null
  tx_avant_1975: number | null
  thermosens_kwh_dj: number | null
  conso_resid_kwh_an: number | null
  conso_gaz_mwh_an: number | null
  pdl_gaz_resid: number | null
}

// ============================================================================
// Auto-download Filosofi 2020 + Recensement Logement 2020 INSEE
// ============================================================================
const DATA_DIR = resolve(process.cwd(), 'data')

const FILOSOFI_URL =
  'https://www.insee.fr/fr/statistiques/fichier/7233950/BASE_TD_FILO_DEC_IRIS_2020_CSV.zip'
const FILOSOFI_CSV = 'BASE_TD_FILO_DEC_IRIS_2020.csv'

const RECENS_URL =
  'https://www.insee.fr/fr/statistiques/fichier/7704078/base-ic-logement-2020_csv.zip'
const RECENS_CSV = 'base-ic-logement-2020.CSV'

async function ensureDataFile(url: string, csvName: string, label: string): Promise<string | null> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  const csvPath = resolve(DATA_DIR, csvName)
  if (existsSync(csvPath)) return csvPath

  const zipPath = resolve(DATA_DIR, `${csvName}.zip`)
  console.log(`📥 ${label} : téléchargement INSEE…`)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.log(`⚠️  ${label} HTTP ${res.status} — skip`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(zipPath, buf)
    execSync(`unzip -o "${zipPath}" -d "${DATA_DIR}"`, { stdio: 'pipe' })
    if (!existsSync(csvPath)) {
      console.log(`⚠️  ${label} : ${csvName} absent après unzip`)
      return null
    }
    console.log(`✅ ${label} téléchargé (${(buf.length / 1024 / 1024).toFixed(1)} Mo zip)`)
    return csvPath
  } catch (err) {
    console.log(`⚠️  ${label} download erreur :`, err)
    return null
  }
}

// ============================================================================
// Filosofi 2020 IRIS — médiane revenu UC + déciles
// Format : IRIS;DEC_PIMP20;DEC_TP6020;DEC_Q120;DEC_MED20;DEC_Q320;DEC_EQ20;DEC_D120;...;DEC_D920;...
// Col 1 (idx 0) = IRIS, col 5 (idx 4) = DEC_MED20, col 8 (idx 7) = DEC_D120, col 15 (idx 14) = DEC_D920
// Décimales : virgule
// ============================================================================
async function loadFilosofi(): Promise<Map<string, { med21: number; d121: number; d921: number }>> {
  const path = await ensureDataFile(FILOSOFI_URL, FILOSOFI_CSV, 'Filosofi 2020')
  if (!path) {
    console.log('⚠️  Filosofi indisponible — skip décile MPR auto')
    return new Map()
  }
  const raw = readFileSync(path, 'utf-8').split('\n')
  const map = new Map<string, { med21: number; d121: number; d921: number }>()
  for (let i = 1; i < raw.length; i++) {
    const cols = raw[i].split(';')
    if (cols.length < 16) continue
    const iris = cols[0]?.trim()
    const med = parseFloat(cols[4]?.replace(',', '.'))
    const d1 = parseFloat(cols[7]?.replace(',', '.'))
    const d9 = parseFloat(cols[14]?.replace(',', '.'))
    if (iris && Number.isFinite(med)) {
      map.set(iris, { med21: med, d121: d1 || 0, d921: d9 || 0 })
    }
  }
  console.log(`✅ Filosofi : ${map.size} IRIS chargés`)
  return map
}

// ============================================================================
// Recensement Logement 2020 IRIS — propriétaires, ancienneté
// Format : IRIS;COM;TYP_IRIS;LAB_IRIS;P20_LOG;P20_RP;...;P20_RP_PROP;...
// Col 1 = IRIS, col 6 = P20_RP, col 28-34 = P20_RP_ACH19/45/70/90/05/17, col 63 = P20_RP_PROP
// ============================================================================
async function loadRecensement(): Promise<Map<string, { tx_proprio: number; tx_avant_1975: number }>> {
  const path = await ensureDataFile(RECENS_URL, RECENS_CSV, 'Recensement Logement 2020')
  if (!path) {
    console.log('⚠️  Recensement indisponible — skip tx_proprio/tx_avant_1975')
    return new Map()
  }
  const raw = readFileSync(path, 'utf-8').split('\n')
  const map = new Map<string, { tx_proprio: number; tx_avant_1975: number }>()
  // Header pour trouver index colonnes (robuste si ordre change)
  const header = raw[0].split(';')
  const idx = (name: string) => header.indexOf(name)
  const iIris = idx('IRIS')
  const iRp = idx('P20_RP')
  const iProp = idx('P20_RP_PROP')
  const iAch19 = idx('P20_RP_ACH19')
  const iAch45 = idx('P20_RP_ACH45')
  const iAch70 = idx('P20_RP_ACH70')

  if (iIris < 0 || iRp < 0 || iProp < 0) {
    console.log('⚠️  Recensement format inattendu, colonnes IRIS/P20_RP/P20_RP_PROP introuvables')
    return new Map()
  }

  for (let i = 1; i < raw.length; i++) {
    const cols = raw[i].split(';')
    if (cols.length < Math.max(iProp, iAch70) + 1) continue
    const iris = cols[iIris]?.trim()
    if (!iris) continue
    const rp = parseFloat(cols[iRp])
    const prop = parseFloat(cols[iProp])
    const a19 = parseFloat(cols[iAch19] ?? '0') || 0
    const a45 = parseFloat(cols[iAch45] ?? '0') || 0
    const a70 = parseFloat(cols[iAch70] ?? '0') || 0
    if (rp > 0) {
      // tx_avant_1975 = approximation via 'avant 1971' (P20_RP_ACH70 = 1946-1970)
      const avant1975 = (a19 + a45 + a70) / rp
      const txProp = prop / rp
      map.set(iris, {
        tx_proprio: Number.isFinite(txProp) ? Math.min(1, Math.max(0, txProp)) : 0,
        tx_avant_1975: Number.isFinite(avant1975) ? Math.min(1, Math.max(0, avant1975)) : 0,
      })
    }
  }
  console.log(`✅ Recensement : ${map.size} IRIS chargés`)
  return map
}

// ============================================================================
// Enedis — API Opendatasoft (thermosensibilité IRIS + conso résid)
// ============================================================================
async function fetchEnedisIris(dept: string): Promise<
  Map<string, { thermosens_kwh_dj: number | null; conso_resid_kwh_an: number | null }>
> {
  const map = new Map<string, { thermosens_kwh_dj: number | null; conso_resid_kwh_an: number | null }>()
  const limit = 100
  let offset = 0
  // Dataset officiel : consommation-electrique-par-secteur-dactivite-iris
  // Champs utiles : code_iris, code_grand_secteur, conso_totale_mwh, thermosensibilite_moyenne_kwh_dju, annee
  // On filtre code_grand_secteur=RESIDENTIEL et l'année la plus récente (2023).
  while (true) {
    const params = new URLSearchParams({
      select: 'code_iris,conso_totale_mwh,thermosensibilite_moyenne_kwh_dju,annee',
      where: `code_grand_secteur="RESIDENTIEL" AND startswith(code_iris,"${dept}") AND annee="2023"`,
      limit: String(limit),
      offset: String(offset),
    })
    const url = `https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/consommation-electrique-par-secteur-dactivite-iris/records?${params}`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`⚠️  Enedis ${dept} HTTP ${res.status} — skip`)
        break
      }
      const json = (await res.json()) as { results?: Array<Record<string, unknown>>; total_count?: number }
      const rows = json.results ?? []
      for (const r of rows) {
        const iris = String(r.code_iris ?? '').trim()
        if (!iris) continue
        const th = Number(r.thermosensibilite_moyenne_kwh_dju)
        const co = Number(r.conso_totale_mwh)
        const existing = map.get(iris) ?? { thermosens_kwh_dj: null, conso_resid_kwh_an: null }
        if (Number.isFinite(th) && th > 0) existing.thermosens_kwh_dj = th
        if (Number.isFinite(co) && co > 0) existing.conso_resid_kwh_an = Math.round(co * 1000) // MWh→kWh
        map.set(iris, existing)
      }
      if (rows.length < limit) break
      offset += limit
      if (offset >= 10_000) break // sécurité
    } catch (err) {
      console.log(`⚠️  Enedis ${dept} fetch erreur :`, err)
      break
    }
  }
  console.log(`✅ Enedis ${dept} : ${map.size} IRIS`)
  return map
}

// ============================================================================
// GRDF — API Opendatasoft (conso gaz IRIS)
// ============================================================================
async function fetchGrdfIris(dept: string): Promise<
  Map<string, { conso_gaz_mwh_an: number | null; pdl_gaz_resid: number | null }>
> {
  const map = new Map<string, { conso_gaz_mwh_an: number | null; pdl_gaz_resid: number | null }>()
  const limit = 100
  let offset = 0
  // Dataset officiel : consommation-annuelle-de-gaz-par-iris-et-code-naf0
  // Champs : code_iris, code_categorie ('RES'|'PRO'), nombre_points_de_livraison, consommation_annuelle_en_mwh
  // Filtre code_categorie='RES' pour résidentiel uniquement
  while (true) {
    const params = new URLSearchParams({
      select: 'code_iris,nombre_points_de_livraison,consommation_annuelle_en_mwh,annee_consommation',
      where: `code_categorie="RES" AND startswith(code_iris,"${dept}")`,
      limit: String(limit),
      offset: String(offset),
    })
    const url = `https://opendata.grdf.fr/api/explore/v2.1/catalog/datasets/consommation-annuelle-de-gaz-par-iris-et-code-naf0/records?${params}`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`⚠️  GRDF ${dept} HTTP ${res.status} — skip`)
        break
      }
      const json = (await res.json()) as { results?: Array<Record<string, unknown>> }
      const rows = json.results ?? []
      // Note : Opendatasoft GRDF renvoie les nombres avec virgule comme séparateur décimal ("4780,68098")
      const parseNum = (v: unknown): number => {
        if (typeof v === 'number') return v
        if (typeof v === 'string') return parseFloat(v.replace(',', '.'))
        return Number(v)
      }
      // Garde l'année max par IRIS
      for (const r of rows) {
        const iris = String(r.code_iris ?? '').trim()
        if (!iris) continue
        const sig = parseGrdfIrisSignal({
          conso_totale_mwh: parseNum(r.consommation_annuelle_en_mwh),
          nb_pdl_residentiels: parseNum(r.nombre_points_de_livraison),
        })
        const ex = map.get(iris)
        if (!ex || (sig.conso_gaz_mwh_an ?? 0) > (ex.conso_gaz_mwh_an ?? 0)) {
          map.set(iris, sig)
        }
      }
      if (rows.length < limit) break
      offset += limit
      if (offset >= 10_000) break
    } catch (err) {
      console.log(`⚠️  GRDF ${dept} fetch erreur :`, err)
      break
    }
  }
  console.log(`✅ GRDF ${dept} : ${map.size} IRIS`)
  return map
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`🚀 Phase 11.1.1 — Seed brh_ext_iris (depts: ${DEPTS.join(',')})${DRY_RUN ? ' [DRY-RUN]' : ''}`)

  const filosofi = await loadFilosofi()
  const recensement = await loadRecensement()

  let totalUpsert = 0
  for (const dept of DEPTS) {
    console.log(`\n🔵 Département ${dept}`)
    const [enedis, grdf] = await Promise.all([fetchEnedisIris(dept), fetchGrdfIris(dept)])

    // Union des IRIS (union des sources)
    const allIris = new Set<string>([
      ...Array.from(enedis.keys()),
      ...Array.from(grdf.keys()),
      ...Array.from(filosofi.keys()).filter((k) => k.startsWith(dept)),
    ])

    if (allIris.size === 0) {
      console.log(`⚠️  Aucun IRIS trouvé pour ${dept}`)
      continue
    }

    const records: IrisRecord[] = []
    for (const iris of allIris) {
      if (iris.length !== 9) continue
      const filo = filosofi.get(iris) ?? null
      const reco = recensement.get(iris) ?? null
      const ene = enedis.get(iris) ?? null
      const grd = grdf.get(iris) ?? null

      const decile = filo ? estimateDecile(filo.med21) : null
      const couleur = decile ? decileToCouleurMpr(decile) : null

      records.push({
        iris_code: iris,
        commune_insee: iris.slice(0, 5),
        med21: filo?.med21 ?? null,
        d121: filo?.d121 ?? null,
        d921: filo?.d921 ?? null,
        decile_estime: decile,
        couleur_mpr: couleur,
        tx_proprio: reco?.tx_proprio ?? null,
        tx_avant_1975: reco?.tx_avant_1975 ?? null,
        thermosens_kwh_dj: ene?.thermosens_kwh_dj ?? null,
        conso_resid_kwh_an: ene?.conso_resid_kwh_an ?? null,
        conso_gaz_mwh_an: grd?.conso_gaz_mwh_an ?? null,
        pdl_gaz_resid: grd?.pdl_gaz_resid ?? null,
      })
    }

    console.log(`📦 ${records.length} IRIS prêts à upsert pour ${dept}`)

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Skip upsert. Sample :`, records.slice(0, 2))
      totalUpsert += records.length
      continue
    }

    for (let i = 0; i < records.length; i += CHUNK) {
      const batch = records.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('brh_ext_iris')
        .upsert(batch, { onConflict: 'iris_code' })
      if (error) {
        console.error(`❌ Chunk ${i} erreur :`, error.message)
      } else {
        console.log(`✅ ${i + batch.length}/${records.length} pour ${dept}`)
      }
    }
    totalUpsert += records.length
  }

  console.log(`\n🎉 Terminé. Total upsert : ${totalUpsert} IRIS`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
