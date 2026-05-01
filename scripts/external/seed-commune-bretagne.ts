/**
 * Phase 11.1.1 — Seed brh_ext_commune pour les ~1208 communes bretonnes.
 *
 * Sources :
 *   - geo.api.gouv.fr (liste communes par dépt)            — public
 *   - Géorisques (BRGM)  — RGA, radon, inondation, cavités — public
 *   - Annuaire RGE ADEME — concurrence locale              — public
 *
 * Stratégie :
 *   - 1 fetch initial : liste communes par dépt
 *   - Pour chaque commune : 5 appels parallèles (RGA, radon, inondation, cavités, RGE)
 *   - Throttle 5 req/s pour respecter rate limits APIs publiques
 *   - UPSERT par chunks 200, idempotent
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/seed-commune-bretagne.ts [--dept=29] [--dry-run] [--limit=20]
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

const BZH_DEPTS = ['22', '29', '35', '56']
const CHUNK = 200
const THROTTLE_MS = 200 // 5 req/s

const argDept = process.argv.find((a) => a.startsWith('--dept='))?.split('=')[1]
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const DEPTS = argDept ? [argDept] : BZH_DEPTS

interface CommuneRecord {
  insee: string
  radon_categorie: 1 | 2 | 3 | null
  rga_alea: 'faible' | 'moyen' | 'fort' | null
  ppri_present: boolean
  sismique_zone: number | null
  opah_active: boolean
  opah_type: string | null
  opah_operateur: string | null
  opah_fin_validite: string | null
  tx_vacance_struct: number | null
  nb_rge_isolation: number | null
  nb_rge_pac: number | null
  nb_dp_logements_existants_12m: number | null
  station_dju_id: string | null
  dju_18_normal: number | null
  delta_dju_2050: number | null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ============================================================================
// geo.api.gouv.fr — liste communes par dépt + centroid
// ============================================================================
interface CommuneInfo {
  code: string
  centre?: { coordinates?: [number, number] } // GeoJSON [lon, lat]
}

async function fetchCommunes(dept: string): Promise<CommuneInfo[]> {
  const url = `https://geo.api.gouv.fr/departements/${dept}/communes?fields=code,centre&format=json&geometry=centre`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`❌ geo.api.gouv.fr HTTP ${res.status} pour ${dept}`)
    return []
  }
  return (await res.json()) as CommuneInfo[]
}

// ============================================================================
// Géorisques — 4 endpoints par INSEE
// ============================================================================
const GR_API = 'https://georisques.gouv.fr/api/v1'

interface RgaResponse {
  codeExposition?: string | number
  exposition?: string
}

interface RadonData {
  classe_potentiel?: string | number
}

interface RisquesGasparData {
  risques_detail?: Array<{ num_risque?: string }>
}

interface SismiqueData {
  code_zone?: string | number
}

const RGA_CODE_TO_ALEA: Record<string, 'faible' | 'moyen' | 'fort'> = {
  '1': 'faible',
  '2': 'moyen',
  '3': 'fort',
}

async function fetchGeorisquesCommune(
  insee: string,
  centroid?: { lat: number; lon: number },
): Promise<{
  rga_alea: 'faible' | 'moyen' | 'fort' | null
  radon_categorie: 1 | 2 | 3 | null
  ppri_present: boolean
  sismique_zone: number | null
}> {
  try {
    // RGA exige latlon — on saute si pas de centroid
    const rgaUrl = centroid
      ? `${GR_API}/rga?code_insee=${insee}&latlon=${centroid.lon},${centroid.lat}&rayon=1000`
      : null

    const [rgaRes, radonRes, gasparRes, sismRes] = await Promise.all([
      rgaUrl ? fetch(rgaUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
      fetch(`${GR_API}/radon?code_insee=${insee}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${GR_API}/gaspar/risques?code_insee=${insee}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${GR_API}/zonage_sismique?code_insee=${insee}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])

    const rga = rgaRes as RgaResponse | null
    const rgaCode = rga?.codeExposition != null ? String(rga.codeExposition) : null
    const rga_alea = rgaCode ? (RGA_CODE_TO_ALEA[rgaCode] ?? null) : null

    const radon = (radonRes as { data?: RadonData[] } | null)?.data?.[0]
    const radonClasse = radon?.classe_potentiel != null ? Number(radon.classe_potentiel) : null
    const radon_categorie = radonClasse === 1 || radonClasse === 2 || radonClasse === 3 ? radonClasse : null

    const risques = (gasparRes as { data?: RisquesGasparData[] } | null)?.data?.[0]
    const ppri_present =
      risques?.risques_detail?.some((r) => r.num_risque?.startsWith('11')) ?? false

    const sism = (sismRes as { data?: SismiqueData[] } | null)?.data?.[0]
    const sismique_zone = sism?.code_zone != null ? Number(sism.code_zone) : null

    return { rga_alea, radon_categorie, ppri_present, sismique_zone }
  } catch {
    return { rga_alea: null, radon_categorie: null, ppri_present: false, sismique_zone: null }
  }
}

// ============================================================================
// Annuaire RGE ADEME (Opendatasoft)
// ============================================================================
async function fetchRgeCommune(insee: string): Promise<{ nb_rge_isolation: number; nb_rge_pac: number }> {
  // API ADEME : /datasets/liste-des-entreprises-rge-2/records
  // Filtre par code INSEE commune (champ `code_insee_commune`)
  try {
    const params = new URLSearchParams({
      where: `code_insee_commune="${insee}" AND date_fin_validite >= "${new Date().toISOString().slice(0, 10)}"`,
      limit: '100',
    })
    const url = `https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines?${params}`
    const res = await fetch(url)
    if (!res.ok) return { nb_rge_isolation: 0, nb_rge_pac: 0 }
    const json = await res.json() as { results?: Array<{ nom_certificat?: string }> }
    const rows = json.results ?? []
    const nb_iso = rows.filter((r) => /isolation|ITE|combles|murs/i.test(r.nom_certificat ?? '')).length
    const nb_pac = rows.filter((r) => /pompe|PAC|chaleur/i.test(r.nom_certificat ?? '')).length
    return { nb_rge_isolation: nb_iso, nb_rge_pac: nb_pac }
  } catch {
    return { nb_rge_isolation: 0, nb_rge_pac: 0 }
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(
    `🚀 Phase 11.1.1 — Seed brh_ext_commune (depts: ${DEPTS.join(',')})${DRY_RUN ? ' [DRY-RUN]' : ''}${LIMIT ? ` [LIMIT=${LIMIT}]` : ''}`,
  )

  let totalUpsert = 0

  for (const dept of DEPTS) {
    console.log(`\n🔵 Département ${dept}`)
    let communes = await fetchCommunes(dept)
    console.log(`📋 ${communes.length} communes pour ${dept}`)
    if (LIMIT > 0) communes = communes.slice(0, LIMIT)

    const records: CommuneRecord[] = []

    for (let i = 0; i < communes.length; i++) {
      const c = communes[i]
      const insee = c.code
      const coords = c.centre?.coordinates
      const centroid = coords && coords.length === 2 ? { lon: coords[0], lat: coords[1] } : undefined

      const [risques, rge] = await Promise.all([
        fetchGeorisquesCommune(insee, centroid),
        fetchRgeCommune(insee),
      ])

      records.push({
        insee,
        radon_categorie: risques.radon_categorie,
        rga_alea: risques.rga_alea,
        ppri_present: risques.ppri_present,
        sismique_zone: risques.sismique_zone,
        opah_active: false,
        opah_type: null,
        opah_operateur: null,
        opah_fin_validite: null,
        tx_vacance_struct: null,
        nb_rge_isolation: rge.nb_rge_isolation,
        nb_rge_pac: rge.nb_rge_pac,
        nb_dp_logements_existants_12m: null,
        station_dju_id: null,
        dju_18_normal: null,
        delta_dju_2050: null,
      })

      if ((i + 1) % 25 === 0) {
        console.log(`  ${i + 1}/${communes.length} (${insee})`)
      }
      await sleep(THROTTLE_MS)
    }

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Sample :`, records.slice(0, 2))
      totalUpsert += records.length
      continue
    }

    for (let i = 0; i < records.length; i += CHUNK) {
      const batch = records.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('brh_ext_commune')
        .upsert(batch, { onConflict: 'insee' })
      if (error) {
        console.error(`❌ Chunk ${i} ${dept} :`, error.message)
      } else {
        console.log(`✅ Upsert ${i + batch.length}/${records.length} pour ${dept}`)
      }
    }
    totalUpsert += records.length
  }

  console.log(`\n🎉 Terminé. Total upsert : ${totalUpsert} communes`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
