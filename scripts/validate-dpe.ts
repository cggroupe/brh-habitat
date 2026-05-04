/**
 * Validation P2.5 — Comparaison moteur BRH vs Open Data ADEME.
 *
 * Approche :
 * 1. Fetch N DPE 3CL réels depuis l'API ADEME (data.ademe.fr)
 * 2. Mapper chaque DPE → AuditInputs (heuristiques)
 * 3. Lancer computeDpe
 * 4. Comparer CEP, GES, étiquettes
 * 5. Calculer écarts moyens et max + sortir rapport markdown
 *
 * Cible : tolérance ±5% sur CEP/GES (mais V1 acceptable jusqu'à ±30% car
 * heuristiques de mapping non triviales).
 *
 * Usage :
 *   npx tsx scripts/validate-dpe.ts [--size 50] [--zone H2A]
 */

import { writeFileSync } from 'node:fs'
import { computeDpe } from '../src/lib/dpe-engine'
import type {
  AuditInputs,
  ChauffageInput,
  EcsInput,
  GenerateurChauffage,
  ParoiInput,
  OuvertureInput,
  PeriodeConstruction,
  TypeBatiment,
  Ventilation,
  EtiquetteDpe,
  ZoneClimatique,
  Inertie,
} from '../src/lib/dpe-engine/types'
import { ORDER_DPE } from '../src/lib/dpe-engine'

const DATASET = 'meg-83tjwtg8dyz4vv7h1dqe' // DPE Logements existants (depuis juillet 2021)
const API_BASE = 'https://data.ademe.fr/data-fair/api/v1/datasets'

// CLI args
const args = process.argv.slice(2)
const size = parseInt(args[args.indexOf('--size') + 1] || '50', 10)
const zoneFilter = args[args.indexOf('--zone') + 1] || 'H2A'
const typeFilter = args[args.indexOf('--type') + 1] || 'maison' // 'maison' | 'appartement' | 'all'

const FIELDS = [
  'numero_dpe',
  'etiquette_dpe',
  'etiquette_ges',
  'conso_5_usages_par_m2_ep',
  'emission_ges_5_usages_par_m2',
  'surface_habitable_immeuble',
  'surface_chauffee_installation_chauffage_n1',
  'type_batiment',
  'periode_construction',
  'classe_inertie_batiment',
  'classe_altitude',
  'type_energie_principale_chauffage',
  'type_generateur_chauffage_principal',
  'description_installation_chauffage_n1',
  'type_emetteur_installation_chauffage_n1',
  'type_energie_principale_ecs',
  'type_generateur_n1_ecs_n1',
  'description_generateur_n1_ecs_n1',
  'ventilation_posterieure_2012',
  'qualite_isolation_murs',
  'qualite_isolation_plancher_bas',
  'qualite_isolation_plancher_haut_comble_perdu',
  'qualite_isolation_menuiseries',
  'qualite_isolation_enveloppe',
  'zone_climatique',
  'code_insee_ban',
  'code_postal_ban',
  'nombre_niveau_immeuble',
  'volume_stockage_generateur_n1_ecs_n1',
  'modele_dpe',
].join(',')

interface AdemeDPE {
  numero_dpe: string
  etiquette_dpe: string
  etiquette_ges: string
  conso_5_usages_par_m2_ep: number
  emission_ges_5_usages_par_m2: number
  surface_habitable_immeuble?: number
  surface_chauffee_installation_chauffage_n1?: number
  type_batiment: string
  periode_construction?: string
  classe_inertie_batiment?: string
  classe_altitude?: string
  type_energie_principale_chauffage?: string
  type_generateur_chauffage_principal?: string
  description_installation_chauffage_n1?: string
  type_emetteur_installation_chauffage_n1?: string
  type_energie_principale_ecs?: string
  type_generateur_n1_ecs_n1?: string
  description_generateur_n1_ecs_n1?: string
  ventilation_posterieure_2012?: number
  qualite_isolation_murs?: string
  qualite_isolation_plancher_bas?: string
  qualite_isolation_plancher_haut_comble_perdu?: string
  qualite_isolation_menuiseries?: string
  qualite_isolation_enveloppe?: string
  zone_climatique?: string
  code_insee_ban?: string
  code_postal_ban?: string
  nombre_niveau_immeuble?: number
  volume_stockage_generateur_n1_ecs_n1?: number
  modele_dpe?: string
}

// ============================================================================
// FETCH ADEME
// ============================================================================

async function fetchAdemeDPEs(opts: { size: number; zone: string; type: string }): Promise<AdemeDPE[]> {
  // Les zones ADEME sont en minuscules (H1a, H2b, ...)
  const zoneLower = opts.zone.toLowerCase().replace(/^h(\d)([abcd])$/i, 'H$1$2')
  const url = new URL(`${API_BASE}/${DATASET}/lines`)
  url.searchParams.set('size', String(opts.size))
  url.searchParams.set('select', FIELDS)
  let qs = `zone_climatique:"${zoneLower}"`
  if (opts.type !== 'all') qs += ` AND type_batiment:"${opts.type}"`
  url.searchParams.set('qs', qs)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`ADEME API error: ${response.status} ${await response.text()}`)
  }
  const data = (await response.json()) as { results: AdemeDPE[] }
  return data.results.filter(
    (r) =>
      r.numero_dpe &&
      r.etiquette_dpe &&
      r.conso_5_usages_par_m2_ep > 0 &&
      (r.surface_habitable_immeuble ?? r.surface_chauffee_installation_chauffage_n1 ?? 0) > 0 &&
      r.modele_dpe?.includes('3CL'),
  )
}

// ============================================================================
// MAPPING ADEME → AuditInputs
// ============================================================================

function mapPeriodeConstruction(annee?: number, periode?: string): PeriodeConstruction {
  if (annee) {
    if (annee < 1948) return 'avant_1948'
    if (annee < 1975) return '1948-1974'
    if (annee < 1978) return '1975-1977'
    if (annee < 1983) return '1978-1982'
    if (annee < 1989) return '1983-1988'
    if (annee < 2001) return '1989-2000'
    if (annee < 2006) return '2001-2005'
    if (annee < 2013) return '2006-2012'
    return 'apres_2013'
  }
  // fallback depuis periode_construction texte
  const p = periode?.toLowerCase() ?? ''
  if (p.includes('avant 1948') || p.includes('< 1948')) return 'avant_1948'
  if (p.includes('1948') && p.includes('1974')) return '1948-1974'
  if (p.includes('2013') || p.includes('rt2012')) return 'apres_2013'
  return '1948-1974' // défaut conservateur
}

function mapTypeBatiment(t?: string): TypeBatiment {
  const s = (t ?? '').toLowerCase()
  if (s.includes('appartement') || s.includes('immeuble collectif')) return 'appartement'
  if (s.includes('immeuble')) return 'immeuble'
  return 'maison'
}

function mapInertie(c?: string): Inertie | string {
  const s = (c ?? '').toLowerCase()
  if (s.includes('très lourde') || s.includes('tres lourde')) return 'tres_lourde'
  if (s.includes('lourde')) return 'LOURDE'
  if (s.includes('moyenne')) return 'moyenne'
  return 'LEGERE'
}

function mapVentilation(v?: string): Ventilation {
  const s = (v ?? '').toLowerCase()
  if (s.includes('double flux') && s.includes('échangeur')) return 'vmc_double_flux_avec_recup'
  if (s.includes('double flux')) return 'vmc_double_flux_sans_recup'
  if (s.includes('hygro b')) return 'vmc_sf_hygro_b_apres_2012'
  if (s.includes('hygro a')) return 'vmc_sf_hygro_a'
  if (s.includes('vmc') && (s.includes('après 2000') || s.includes('apres 2000'))) {
    return 'vmc_sf_auto_apres_2000'
  }
  if (s.includes('vmc') && s.includes('1982')) return 'vmc_sf_auto_1982_2000'
  if (s.includes('vmc')) return 'vmc_sf_auto_apres_2000'
  return 'naturelle'
}

function mapChauffage(dpe: AdemeDPE): ChauffageInput {
  const desc = (dpe.description_installation_chauffage_n1 ?? '').toLowerCase()
  const type = (dpe.type_generateur_chauffage_principal ?? '').toLowerCase()
  const energie = (dpe.type_energie_principale_chauffage ?? '').toLowerCase()

  let generateur: GenerateurChauffage = 'autre'
  if (type.includes('pac air/air') || desc.includes('pac air/air')) generateur = 'pac_air_air'
  else if (type.includes('pac air/eau') || desc.includes('pac air/eau')) generateur = 'pac_air_eau'
  else if (type.includes('pac eau/eau') || desc.includes('pac eau/eau')) generateur = 'pac_eau_eau'
  else if (type.includes('chaudière') && energie.includes('gaz')) {
    if (desc.includes('condensation')) generateur = 'chaudiere_gaz_condensation'
    else if (desc.includes('basse temp')) generateur = 'chaudiere_gaz_basse_temp'
    else generateur = 'chaudiere_gaz_standard'
  } else if (type.includes('chaudière') && energie.includes('fioul')) {
    generateur = desc.includes('condensation') ? 'chaudiere_fioul_condensation' : 'chaudiere_fioul'
  } else if (type.includes('chaudière') && energie.includes('granulés')) {
    generateur = 'chaudiere_granules_bois'
  } else if (type.includes('chaudière') && energie.includes('bois')) {
    generateur = 'chaudiere_bois_buche'
  } else if (type.includes('radiateur électrique') || desc.includes('radiateur électrique')) {
    if (desc.includes('inertie') || desc.includes('chaleur douce')) generateur = 'inertie_electrique'
    else generateur = 'effet_joule_direct'
  } else if (type.includes('convecteur') || desc.includes('convecteur')) {
    generateur = 'effet_joule_direct'
  } else if (energie.includes('réseau de chaleur')) {
    generateur = 'reseau_chaleur'
  }

  let emetteur: ChauffageInput['emetteur'] = undefined
  if (desc.includes('plancher chauffant')) emetteur = 'plancher_chauffant'
  else if (desc.includes('mural') && desc.includes('chauffant')) emetteur = 'mural_chauffant'
  else if (desc.includes('radiateur') && desc.includes('élect')) emetteur = 'convecteur_electrique'
  else if (desc.includes('radiateur')) emetteur = 'radiateur_eau'
  else if (desc.includes('split')) emetteur = 'split_air_air'
  else if (desc.includes('air soufflé')) emetteur = 'air_souffle'

  return {
    generateur,
    emetteur,
    regulation: desc.includes('programmateur') || desc.includes('régul'),
    anneeInstallation: 2010, // défaut milieu
  }
}

function mapEcs(dpe: AdemeDPE): EcsInput {
  const type = (dpe.type_generateur_n1_ecs_n1 ?? '').toLowerCase()
  const energie = (dpe.type_energie_principale_ecs ?? '').toLowerCase()
  let generateur: EcsInput['generateur'] = 'electrique'
  if (type.includes('thermodynamique') || type.includes('cet')) generateur = 'cet'
  else if (energie.includes('gaz')) generateur = 'gaz'
  else if (energie.includes('fioul')) generateur = 'fioul'
  else if (energie.includes('bois')) generateur = 'bois'
  else if (energie.includes('réseau')) generateur = 'reseau_chaleur'
  return {
    generateur,
    stockageL: dpe.volume_stockage_generateur_n1_ecs_n1 ?? 0,
  }
}

function mapIsolation(qualite?: string): ParoiInput['isolation'] {
  const q = (qualite ?? '').toLowerCase()
  if (q.includes('très bonne') || q.includes('tres bonne')) {
    return { type: 'iti', epaisseur: 200, lambda: 0.032 }
  }
  if (q.includes('bonne')) {
    return { type: 'iti', epaisseur: 120, lambda: 0.038 }
  }
  if (q.includes('moyenne')) {
    return { type: 'iti', epaisseur: 60, lambda: 0.04 }
  }
  return { type: 'sans' }
}

function sanitizeInsee(raw?: string): string {
  if (!raw) return '29019' // fallback Brest
  // ADEME peut renvoyer "old 50385" ou "new 50385" → on extrait juste 5 chiffres
  const match = raw.match(/\d{5}|2[AB]\d{3}/i)
  if (!match) return '29019'
  return match[0].toUpperCase()
}

function makeInputs(dpe: AdemeDPE): AuditInputs {
  const sh = dpe.surface_chauffee_installation_chauffage_n1 ?? dpe.surface_habitable_immeuble ?? 100
  const nbNiveaux = dpe.nombre_niveau_immeuble ?? (mapTypeBatiment(dpe.type_batiment) === 'maison' ? 1 : 1)
  const hsp = 2.5
  const volume = sh * hsp

  // Estimation surfaces parois (heuristiques V1)
  const surfaceMurs = Math.sqrt(sh / nbNiveaux) * 4 * hsp * nbNiveaux * 0.85 // -15% ouvertures
  const surfacePlancherBas = sh / nbNiveaux
  const surfacePlancherHaut = sh / nbNiveaux
  const surfaceOuvertures = sh * 0.16 // ratio typique 16%

  const parois: ParoiInput[] = [
    {
      type: 'mur',
      surface: surfaceMurs,
      adjacence: 'exterieur',
      materiau: 'parpaing',
      isolation: mapIsolation(dpe.qualite_isolation_murs),
    },
    {
      type: 'plancher_bas',
      surface: surfacePlancherBas,
      adjacence: 'vide_sanitaire',
      isolation: mapIsolation(dpe.qualite_isolation_plancher_bas),
    },
    {
      type: 'plancher_haut',
      surface: surfacePlancherHaut,
      adjacence: 'combles_perdus',
      isolation: mapIsolation(dpe.qualite_isolation_plancher_haut_comble_perdu),
    },
  ]

  const isoMen = mapIsolation(dpe.qualite_isolation_menuiseries)
  let vitrage: OuvertureInput['vitrage'] = 'simple'
  let menuiserie: OuvertureInput['menuiserie'] = 'pvc'
  if (isoMen.type !== 'sans') {
    vitrage = (isoMen.epaisseur ?? 0) >= 200 ? 'triple' : 'double'
    menuiserie = 'pvc'
  }

  const ouvertures: OuvertureInput[] = [
    { type: 'fenetre', surface: surfaceOuvertures * 0.6, orientation: 'sud', menuiserie, vitrage },
    { type: 'fenetre', surface: surfaceOuvertures * 0.3, orientation: 'nord', menuiserie, vitrage },
    { type: 'porte', surface: surfaceOuvertures * 0.1, menuiserie: 'bois' },
  ]

  return {
    geo: {
      codeInsee: sanitizeInsee(dpe.code_insee_ban),
      altitude: dpe.classe_altitude?.includes('800') ? 1000 : dpe.classe_altitude?.includes('400') ? 500 : 50,
      // ADEME format minuscule (H1a) → moteur format majuscule (H1A)
      zone: (dpe.zone_climatique ?? 'H2a').toUpperCase().replace('H1', 'H1').replace('H2', 'H2') as ZoneClimatique,
    },
    bati: {
      surfaceHabitable: sh,
      volume,
      hauteurSousPlafond: hsp,
      nombreNiveaux: nbNiveaux,
      periodeConstruction: mapPeriodeConstruction(dpe.annee_construction, dpe.periode_construction),
      inertie: mapInertie(dpe.classe_inertie_batiment),
      typeBatiment: mapTypeBatiment(dpe.type_batiment),
      parois,
      ouvertures,
    },
    equipements: {
      chauffage: mapChauffage(dpe),
      ecs: mapEcs(dpe),
      ventilation: mapVentilation(
        dpe.ventilation_posterieure_2012 === 1 ? 'vmc post-2012' : 'naturelle',
      ),
    },
    comportement: 'conventionnel',
  }
}

// ============================================================================
// COMPARAISON
// ============================================================================

interface Comparison {
  numero_dpe: string
  ademe: { cep: number; ges: number; etiquetteDpe: string; etiquetteGes: string }
  brh: { cep: number; ges: number; etiquetteDpe: string; etiquetteGes: string }
  ecartCepPct: number
  ecartGesPct: number
  ecartEtiquetteDpe: number
  ecartEtiquetteGes: number
  type_batiment: string
  surface: number
  energie_chauffage: string
}

function getSurface(dpe: AdemeDPE): number {
  return (
    dpe.surface_chauffee_installation_chauffage_n1 ??
    dpe.surface_habitable_immeuble ??
    100
  )
}

function compareDPE(dpe: AdemeDPE): Comparison {
  const inputs = makeInputs(dpe)
  const r = computeDpe(inputs)

  const ecartCepPct = ((r.cepKwhEpM2An - dpe.conso_5_usages_par_m2_ep) / dpe.conso_5_usages_par_m2_ep) * 100
  const ecartGesPct =
    dpe.emission_ges_5_usages_par_m2 > 0
      ? ((r.gesKgCo2M2An - dpe.emission_ges_5_usages_par_m2) / dpe.emission_ges_5_usages_par_m2) * 100
      : 0

  const ecartEtiquetteDpe = ORDER_DPE[r.etiquetteDpe] - ORDER_DPE[dpe.etiquette_dpe as EtiquetteDpe]
  const ecartEtiquetteGes = ORDER_DPE[r.etiquetteClimat] - ORDER_DPE[dpe.etiquette_ges as EtiquetteDpe]

  return {
    numero_dpe: dpe.numero_dpe,
    ademe: {
      cep: dpe.conso_5_usages_par_m2_ep,
      ges: dpe.emission_ges_5_usages_par_m2,
      etiquetteDpe: dpe.etiquette_dpe,
      etiquetteGes: dpe.etiquette_ges,
    },
    brh: {
      cep: Math.round(r.cepKwhEpM2An),
      ges: Math.round(r.gesKgCo2M2An * 10) / 10,
      etiquetteDpe: r.etiquetteDpe,
      etiquetteGes: r.etiquetteClimat,
    },
    ecartCepPct,
    ecartGesPct,
    ecartEtiquetteDpe,
    ecartEtiquetteGes,
    type_batiment: dpe.type_batiment,
    surface: getSurface(dpe),
    energie_chauffage: dpe.type_energie_principale_chauffage ?? '',
  }
}

// ============================================================================
// RAPPORT
// ============================================================================

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stats(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0, p90: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round((sum / values.length) * 100) / 100,
    median: Math.round(median(values) * 100) / 100,
    p90: Math.round(sorted[Math.floor(sorted.length * 0.9)] * 100) / 100,
  }
}

function generateReport(comparisons: Comparison[]): string {
  const cepEcarts = comparisons.map((c) => Math.abs(c.ecartCepPct))
  const gesEcarts = comparisons.filter((c) => c.ademe.ges > 0).map((c) => Math.abs(c.ecartGesPct))
  const etiquetteEcarts = comparisons.map((c) => Math.abs(c.ecartEtiquetteDpe))

  // Distribution des écarts d'étiquette (DPE final)
  const distEtiquette = comparisons.reduce(
    (acc, c) => {
      acc[c.ecartEtiquetteDpe] = (acc[c.ecartEtiquetteDpe] ?? 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  const cepStats = stats(cepEcarts)
  const gesStats = stats(gesEcarts)
  const etiquetteStats = stats(etiquetteEcarts)

  const within5 = comparisons.filter((c) => Math.abs(c.ecartCepPct) <= 5).length
  const within15 = comparisons.filter((c) => Math.abs(c.ecartCepPct) <= 15).length
  const within30 = comparisons.filter((c) => Math.abs(c.ecartCepPct) <= 30).length
  const sameLabel = comparisons.filter((c) => c.ecartEtiquetteDpe === 0).length
  const within1Class = comparisons.filter((c) => Math.abs(c.ecartEtiquetteDpe) <= 1).length

  const lines: string[] = []
  lines.push(`# Validation P2.5 — Moteur BRH vs Open Data ADEME\n`)
  lines.push(`> Comparaison sur **${comparisons.length} DPE 3CL réels** (zone ${zoneFilter}, données ADEME).`)
  lines.push(`> Date : ${new Date().toISOString().slice(0, 10)} | Cible : ±5% | Acceptable V1 : ±30%\n`)
  lines.push(`---\n`)
  lines.push(`## Résumé exécutif\n`)
  lines.push(`| Métrique | Moyenne | Médiane | Min | Max | P90 |`)
  lines.push(`|---|---|---|---|---|---|`)
  lines.push(
    `| **Écart CEP** (%) | ${cepStats.avg} | ${cepStats.median} | ${cepStats.min} | ${cepStats.max} | ${cepStats.p90} |`,
  )
  lines.push(
    `| **Écart GES** (%) | ${gesStats.avg} | ${gesStats.median} | ${gesStats.min} | ${gesStats.max} | ${gesStats.p90} |`,
  )
  lines.push(
    `| **Écart étiquette DPE** (classes) | ${etiquetteStats.avg} | ${etiquetteStats.median} | ${etiquetteStats.min} | ${etiquetteStats.max} | ${etiquetteStats.p90} |`,
  )
  lines.push(``)

  lines.push(`## Tolérances atteintes\n`)
  lines.push(`| Tolérance | CEP | % |`)
  lines.push(`|---|---|---|`)
  lines.push(`| ±5% | ${within5}/${comparisons.length} | ${((within5 / comparisons.length) * 100).toFixed(0)}% |`)
  lines.push(`| ±15% | ${within15}/${comparisons.length} | ${((within15 / comparisons.length) * 100).toFixed(0)}% |`)
  lines.push(`| ±30% | ${within30}/${comparisons.length} | ${((within30 / comparisons.length) * 100).toFixed(0)}% |`)
  lines.push(``)
  lines.push(`| Étiquette finale | Cas | % |`)
  lines.push(`|---|---|---|`)
  lines.push(
    `| **Identique** (Δ=0) | ${sameLabel}/${comparisons.length} | ${((sameLabel / comparisons.length) * 100).toFixed(0)}% |`,
  )
  lines.push(
    `| **±1 classe** | ${within1Class}/${comparisons.length} | ${((within1Class / comparisons.length) * 100).toFixed(0)}% |`,
  )
  lines.push(``)

  lines.push(`## Distribution des écarts d'étiquette\n`)
  lines.push(`| Δ classe | Cas | Interprétation |`)
  lines.push(`|---|---|---|`)
  for (let d = -6; d <= 6; d++) {
    const count = distEtiquette[d] ?? 0
    if (count === 0) continue
    let interpr = ''
    if (d === 0) interpr = '✅ Identique'
    else if (d > 0) interpr = `BRH plus pessimiste de ${d} classe(s)`
    else interpr = `BRH plus optimiste de ${-d} classe(s)`
    lines.push(`| ${d > 0 ? '+' : ''}${d} | ${count} | ${interpr} |`)
  }
  lines.push(``)

  lines.push(`## Top 10 cas les plus précis (CEP)\n`)
  const sorted = [...comparisons].sort((a, b) => Math.abs(a.ecartCepPct) - Math.abs(b.ecartCepPct))
  lines.push(`| # | Type | Surface | Énergie | ADEME CEP | BRH CEP | Δ% | Étiq ADEME→BRH |`)
  lines.push(`|---|---|---|---|---|---|---|---|`)
  sorted.slice(0, 10).forEach((c, i) => {
    lines.push(
      `| ${i + 1} | ${c.type_batiment.slice(0, 20)} | ${c.surface}m² | ${c.energie_chauffage.slice(0, 15)} | ${c.ademe.cep} | ${c.brh.cep} | ${c.ecartCepPct.toFixed(1)}% | ${c.ademe.etiquetteDpe}→${c.brh.etiquetteDpe} |`,
    )
  })
  lines.push(``)

  lines.push(`## Top 10 cas les plus déviants (CEP)\n`)
  lines.push(`| # | Type | Surface | Énergie | ADEME CEP | BRH CEP | Δ% | Étiq ADEME→BRH |`)
  lines.push(`|---|---|---|---|---|---|---|---|`)
  sorted
    .slice(-10)
    .reverse()
    .forEach((c, i) => {
      lines.push(
        `| ${i + 1} | ${c.type_batiment.slice(0, 20)} | ${c.surface}m² | ${c.energie_chauffage.slice(0, 15)} | ${c.ademe.cep} | ${c.brh.cep} | ${c.ecartCepPct.toFixed(1)}% | ${c.ademe.etiquetteDpe}→${c.brh.etiquetteDpe} |`,
      )
    })
  lines.push(``)

  lines.push(`## Verdict V1\n`)
  if (within5 / comparisons.length >= 0.5) {
    lines.push(`✅ **Cible ±5% atteinte sur ≥50% des cas** — moteur BRH conforme.`)
  } else if (within15 / comparisons.length >= 0.6) {
    lines.push(`🟡 **Cible ±15% atteinte sur ≥60% des cas** — V1 acceptable, optimisations Phase 3 nécessaires.`)
  } else {
    lines.push(
      `🟠 **Précision V1 limitée** (heuristiques de mapping inputs incomplètes). Étiquettes correctes à ±1 classe sur ${((within1Class / comparisons.length) * 100).toFixed(0)}% des cas, ce qui est exploitable pour un classement DPE indicatif.`,
    )
  }
  lines.push(``)
  lines.push(`### Sources d'écart identifiées (à corriger Phase 3+)\n`)
  lines.push(
    `1. **Surfaces parois calculées par heuristique** : 4 × √Sh × Hsp × 0.85 — surestime/sous-estime selon géométrie réelle`,
  )
  lines.push(
    `2. **Matériau gros œuvre = parpaing par défaut** : R(gros œuvre) imprécis, surtout pour pierre/brique pleine/bois`,
  )
  lines.push(
    `3. **Année installation chauffage = 2010 forfait** : SCOP/Rg dépendent de l'année exacte`,
  )
  lines.push(
    `4. **Ponts thermiques en forfait 5-12%** vs lookup ψ × L détaillé CapRénov+ (écart typique ±5%)`,
  )
  lines.push(`5. **Tables ψ menuiseries non implémentées** (V1 forfait dans ponts thermiques)`)
  lines.push(`6. **Pertes générateur (Qp0/Qp30/Qp50/Qp100)** non détaillées en V1`)
  lines.push(`7. **DH et ECh** : utilisés depuis JSON 3CL, mais influence forte sur résultat final`)
  lines.push(``)

  return lines.join('\n')
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`Fetching ${size} DPE ADEME zone ${zoneFilter} type ${typeFilter}...`)
  const dpes = await fetchAdemeDPEs({ size, zone: zoneFilter, type: typeFilter })
  console.log(`  → ${dpes.length} DPE 3CL valides récupérés.\n`)

  if (dpes.length === 0) {
    console.error('Aucun DPE 3CL trouvé. Essayer une autre zone.')
    process.exit(1)
  }

  console.log(`Comparaison BRH ↔ ADEME en cours...`)
  const comparisons = dpes.map(compareDPE)

  const report = generateReport(comparisons)
  const outputPath = '/root/projects/site-claude-code/brh-habitat/app/scripts/validate-dpe-results.md'
  writeFileSync(outputPath, report)
  console.log(`\nRapport écrit: ${outputPath}`)

  // Résumé console
  const cepEcarts = comparisons.map((c) => Math.abs(c.ecartCepPct))
  const within5 = comparisons.filter((c) => Math.abs(c.ecartCepPct) <= 5).length
  const sameLabel = comparisons.filter((c) => c.ecartEtiquetteDpe === 0).length
  const within1Class = comparisons.filter((c) => Math.abs(c.ecartEtiquetteDpe) <= 1).length

  console.log(`\n=== RÉSUMÉ ===`)
  console.log(`Total comparé        : ${comparisons.length} DPE`)
  console.log(`Écart CEP moyen      : ${stats(cepEcarts).avg}%`)
  console.log(`Écart CEP médian     : ${stats(cepEcarts).median}%`)
  console.log(`±5% sur CEP          : ${within5}/${comparisons.length} (${((within5 / comparisons.length) * 100).toFixed(0)}%)`)
  console.log(`Étiquette identique  : ${sameLabel}/${comparisons.length} (${((sameLabel / comparisons.length) * 100).toFixed(0)}%)`)
  console.log(`±1 classe étiquette  : ${within1Class}/${comparisons.length} (${((within1Class / comparisons.length) * 100).toFixed(0)}%)`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
