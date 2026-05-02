/**
 * Phase 13.6.1 — Seed artisans RGE bretons depuis l'annuaire ADEME.
 *
 * Source : data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines
 *   - Annuaire officiel des entreprises RGE (Reconnu Garant Environnement)
 *   - Mis à jour quotidiennement par ADEME
 *   - Champs utiles : siret, nom_entreprise, adresse, code_postal, code_insee_commune,
 *     nom_certificat, organisme, date_fin_validite
 *
 * Stratégie idempotente :
 *   - UPSERT par siret
 *   - Aggrège les certifications par entreprise (1 entreprise = N certifications)
 *   - Mappe les nom_certificat → geste_specialites (regex matching)
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/external/seed-artisans-bretagne.ts [--dept=29] [--limit=500] [--dry-run]
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

const ADEME_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines'
const BZH_DEPTS = ['22', '29', '35', '56']
const PAGE_SIZE = 100
const UPSERT_CHUNK = 50

const argDept = process.argv.find((a) => a.startsWith('--dept='))?.split('=')[1]
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const DRY_RUN = process.argv.includes('--dry-run')
const DEPTS = argDept ? [argDept] : BZH_DEPTS

/**
 * Schéma RÉEL renvoyé par l'API DataFair ADEME (vérifié 2026-05-02).
 * Champs notables différents de la doc :
 *   - `nom_qualification` (pas `nom_certificat`)
 *   - `lien_date_fin` (pas `date_fin_validite`)
 *   - `meta_domaine` + `domaine` → mapping gestes plus fiable que regex sur nom certificat
 *   - PAS de `code_insee_commune` — on dérive depuis le code_postal (lookup geo.api.gouv si besoin)
 */
interface AdemeRow {
  siret?: string
  nom_entreprise?: string
  adresse?: string
  code_postal?: string
  commune?: string
  meta_domaine?: string
  domaine?: string
  nom_qualification?: string
  organisme?: string
  lien_date_fin?: string
  latitude?: number | string
  longitude?: number | string
  email?: string
  telephone?: string
  site_internet?: string
}

interface ArtisanAggregated {
  siret: string
  nom_entreprise: string
  representant: string | null
  email: string | null
  telephone: string | null
  site_web: string | null
  adresse: string | null
  code_postal: string | null
  commune: string | null
  code_insee: string
  departement: string
  latitude: number | null
  longitude: number | null
  geste_specialites: string[]
  rge_certifications: Array<{ nom_certificat: string; organisme: string; date_fin: string }>
  nombre_chantiers_lifetime: number
  source: string
  last_verified_at: string
}

/**
 * Mapping `meta_domaine` + `domaine` + `nom_qualification` ADEME → geste_specialites.
 * On combine les 3 champs (concaténés en lowercase) puis regex matching.
 * Aligné avec les GesteId du module marketplace.
 */
function mapCertificatToGestes(nomCert: string): string[] {
  const lower = nomCert.toLowerCase()
  const gestes: string[] = []

  // Pompes à chaleur
  if (/pac|pompe.{0,3}chaleur|qualipac/i.test(lower)) {
    if (/eau.eau|geothermi/i.test(lower)) gestes.push('pac_eau_eau')
    if (/air.eau|aerothermi/i.test(lower)) gestes.push('pac_air_eau')
    if (/air.air/i.test(lower)) gestes.push('pac_air_air')
    if (gestes.length === 0) gestes.push('pac_air_eau') // défaut
  }

  // Isolation
  if (/isolation|qualibat.*isol|combles|murs|plancher/i.test(lower)) {
    if (/comble.*perdu/i.test(lower)) gestes.push('isolation_combles_perdus')
    if (/comble.*amen/i.test(lower)) gestes.push('isolation_combles_amenages')
    if (/comble/i.test(lower) && !gestes.includes('isolation_combles_perdus')) {
      gestes.push('isolation_combles_perdus')
    }
    if (/mur.{0,5}ext|ite|enduit/i.test(lower)) gestes.push('isolation_murs_ite')
    if (/mur.{0,5}int|iti|placo/i.test(lower)) gestes.push('isolation_murs_iti')
    if (/mur/i.test(lower) && !gestes.some((g) => g.startsWith('isolation_murs'))) {
      gestes.push('isolation_murs_ite')
    }
    if (/plancher/i.test(lower)) gestes.push('isolation_plancher_bas')
  }

  // Menuiseries
  if (/menuiserie|fenetre|fenêtre|qualibat.*menuiseries|porte/i.test(lower)) {
    if (/triple.*vitrage/i.test(lower)) gestes.push('fenetres_triple_vitrage')
    else if (/double.*vitrage|vitrage|fenetre|fenêtre/i.test(lower))
      gestes.push('fenetres_double_vitrage')
    if (/porte/i.test(lower)) gestes.push('porte_isolante')
  }

  // VMC
  if (/vmc|ventilation/i.test(lower)) {
    if (/double.*flux/i.test(lower)) gestes.push('vmc_double_flux')
    else gestes.push('vmc_simple_flux')
  }

  // Chauffage bois
  if (/bois|granul|qualibois/i.test(lower)) {
    if (/granul/i.test(lower)) gestes.push('chauffage_bois_granules')
    else if (/buche|bûche/i.test(lower)) gestes.push('chauffage_bois_buche')
    else gestes.push('chauffage_bois_buche')
  }

  // Solaire
  if (/solaire|photovoltaique|photovoltaïque|qualisol/i.test(lower)) {
    if (/eau.{0,3}solaire|chauffe.eau.solaire|cesi/i.test(lower)) gestes.push('chauffe_eau_solaire')
    if (/chauffage.solaire|sscb/i.test(lower)) gestes.push('chauffage_solaire')
  }

  // Chauffe-eau thermo
  if (/chauffe.eau.thermo|cet/i.test(lower)) gestes.push('chauffe_eau_thermodynamique')

  // Dédoublonnage
  return Array.from(new Set(gestes))
}

async function fetchAdemeDept(dept: string): Promise<AdemeRow[]> {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  // Utilise q + qs pour requête textuelle DataFair :
  // qs (query string Elasticsearch) > where (qui ne supporte pas LIKE bien)
  const all: AdemeRow[] = []
  let nextUrl: string | null =
    `${ADEME_URL}?qs=${encodeURIComponent(`code_postal:${dept}*`)}&size=${PAGE_SIZE}`

  const totalLimit = LIMIT > 0 ? LIMIT : 10000
  let fetched = 0

  while (nextUrl && fetched < totalLimit) {
    try {
      const res = await fetch(nextUrl)
      if (!res.ok) {
        console.log(`⚠️  ADEME ${dept} HTTP ${res.status} — arrêt`)
        break
      }
      const json = (await res.json()) as { results?: AdemeRow[]; next?: string; total?: number }
      const rows = json.results ?? []
      if (rows.length === 0) break

      // Filtre client : ne garder que les rows avec code_postal commençant vraiment par dept
      // (au cas où le qs ne filtre pas parfaitement) + cert encore valide
      const filtered = rows.filter((r) => {
        const cp = r.code_postal ?? ''
        if (!cp.startsWith(dept)) return false
        if (r.lien_date_fin && r.lien_date_fin < todayStr) return false
        return true
      })
      all.push(...filtered)
      fetched += rows.length

      nextUrl = json.next ?? null
      if (rows.length < PAGE_SIZE) break
    } catch (err) {
      console.log(`⚠️  ADEME ${dept} fetch erreur :`, err)
      break
    }
  }

  console.log(`✅ ADEME ${dept} : ${all.length} lignes RGE valides (sur ${fetched} fetched)`)
  return all
}

function aggregateBySiret(rows: AdemeRow[]): Map<string, ArtisanAggregated> {
  const out = new Map<string, ArtisanAggregated>()
  for (const row of rows) {
    const siret = row.siret?.replace(/\s/g, '').slice(0, 14)
    if (!siret || siret.length !== 14) continue
    const cp = row.code_postal ?? ''
    if (!cp || cp.length !== 5) continue
    // ADEME ne fournit pas code_insee_commune — on dérive depuis CP (approximation)
    // Phase 13.6.2 : lookup precis via geo.api.gouv.fr
    const insee = cp // proxy : INSEE = code_postal pour beaucoup de communes BZH
    const dept = cp.slice(0, 2)

    let entry = out.get(siret)
    if (!entry) {
      entry = {
        siret,
        nom_entreprise: row.nom_entreprise ?? '(sans nom)',
        representant: null,
        email: row.email ?? null,
        telephone: row.telephone ?? null,
        site_web: row.site_internet ?? null,
        adresse: row.adresse ?? null,
        code_postal: cp,
        commune: row.commune ?? null,
        code_insee: insee,
        departement: dept,
        latitude: typeof row.latitude === 'number' ? row.latitude : parseFloat(String(row.latitude ?? '')) || null,
        longitude: typeof row.longitude === 'number' ? row.longitude : parseFloat(String(row.longitude ?? '')) || null,
        geste_specialites: [],
        rge_certifications: [],
        nombre_chantiers_lifetime: 0,
        source: 'ademe_rge_v2',
        last_verified_at: new Date().toISOString(),
      }
      out.set(siret, entry)
    }

    // Aggregate certification : combine meta_domaine + domaine + nom_qualification
    const certText = [row.meta_domaine, row.domaine, row.nom_qualification].filter(Boolean).join(' ')
    if (certText) {
      entry.rge_certifications.push({
        nom_certificat: row.nom_qualification ?? row.domaine ?? '?',
        organisme: row.organisme ?? '?',
        date_fin: row.lien_date_fin ?? '',
      })
      const gestes = mapCertificatToGestes(certText)
      for (const g of gestes) {
        if (!entry.geste_specialites.includes(g)) entry.geste_specialites.push(g)
      }
    }
  }
  return out
}

async function main() {
  console.log(`🚀 Phase 13.6.1 — Seed artisans RGE Bretagne (depts: ${DEPTS.join(',')})${DRY_RUN ? ' [DRY-RUN]' : ''}${LIMIT ? ` [LIMIT=${LIMIT}]` : ''}`)

  let totalUpsert = 0

  for (const dept of DEPTS) {
    console.log(`\n🔵 Département ${dept}`)
    const rows = await fetchAdemeDept(dept)
    const aggregated = aggregateBySiret(rows)
    console.log(`📊 ${aggregated.size} artisans uniques (par SIRET) pour ${dept}`)

    if (aggregated.size === 0) continue

    const records = Array.from(aggregated.values())

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Sample :`, records.slice(0, 2))
      totalUpsert += records.length
      continue
    }

    for (let i = 0; i < records.length; i += UPSERT_CHUNK) {
      const batch = records.slice(i, i + UPSERT_CHUNK)
      const { error } = await supabase
        .from('brh_artisans_rge')
        .upsert(batch, { onConflict: 'siret' })
      if (error) {
        console.error(`❌ Chunk ${i}/${records.length} ${dept} :`, error.message)
      } else {
        console.log(`✅ ${i + batch.length}/${records.length} pour ${dept}`)
      }
    }
    totalUpsert += records.length
  }

  console.log(`\n🎉 Terminé. Total upsert : ${totalUpsert} artisans RGE Bretagne`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
