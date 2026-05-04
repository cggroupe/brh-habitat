/**
 * Variantes / scénarios de rénovation.
 *
 * Source : caprenov-reverse/wiki/05-variantes-scenarios/
 * ADR-004 : Variantes en delta JSONB (vs XML complet CapRénov+)
 * ADR-005 : Payback simple = USP BRH
 *
 * Workflow :
 * 1. Audit de base (inputs initiaux)
 * 2. Variante = delta JSONB (modifications uniquement)
 * 3. recomputeVariante = deepMerge(base, delta) → computeDpe
 * 4. Coût travaux (chiffrage forfaitaire par geste)
 * 5. Aides (MPR + CEE) + reste à charge + payback simple
 */

import { computeDpe } from '../index'
import type { AuditInputs, DpeResult, ParoiInput, OuvertureInput } from '../types'
import {
  calcAidesScenario,
  zoneClimatToCEE,
  type AidesScenarioResult,
  type CategorieTravaux,
  type CouleurMPR,
  type GesteMprMonoId,
} from '../aides'

/**
 * Convertit une période de construction en année moyenne (pour MPR Ampleur ≥15 ans).
 */
function periodeToAnnee(periode: string): number {
  const map: Record<string, number> = {
    avant_1948: 1900,
    '1948-1974': 1960,
    '1975-1977': 1976,
    '1978-1982': 1980,
    '1983-1988': 1985,
    '1989-2000': 1995,
    '2001-2005': 2003,
    '2006-2012': 2009,
    apres_2013: 2018,
  }
  return map[periode] ?? 1990
}

/** Compte les gestes d'isolation (≥ 2 nécessaires pour MPR Ampleur). */
function countGestesIsolation(gestes: GesteDelta[]): number {
  return gestes.filter((g) => g.geste.startsWith('isolation_')).length
}

// ============================================================================
// Deep merge inputs + delta
// ============================================================================

type Json = string | number | boolean | null | undefined | Json[] | { [k: string]: Json }

function isPlainObject(v: unknown): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Deep merge récursif. Le delta écrase la base.
 * Les arrays sont remplacés (pas mergés).
 * V1 : n'enrichit pas les éléments d'un array (parois, ouvertures).
 *
 * Pour modifier une paroi spécifique, le delta doit fournir le tableau complet
 * `parois: [...]` reformaté.
 */
export function deepMerge<T>(base: T, delta: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(delta)) {
    return (delta as T) ?? base
  }
  const out: Record<string, Json> = { ...(base as Record<string, Json>) }
  for (const k of Object.keys(delta as Record<string, Json>)) {
    const dv = (delta as Record<string, Json>)[k]
    const bv = (base as Record<string, Json>)[k]
    if (isPlainObject(bv) && isPlainObject(dv)) {
      out[k] = deepMerge(bv, dv) as Json
    } else {
      out[k] = dv
    }
  }
  return out as T
}

// ============================================================================
// Recompute variante
// ============================================================================

export function applyDeltaToInputs(base: AuditInputs, delta: Partial<AuditInputs>): AuditInputs {
  return deepMerge(base, delta)
}

export function recomputeVariante(
  base: AuditInputs,
  delta: Partial<AuditInputs>,
): { inputs: AuditInputs; result: DpeResult } {
  const inputs = applyDeltaToInputs(base, delta)
  return { inputs, result: computeDpe(inputs) }
}

// ============================================================================
// Coût travaux par geste (chiffrage forfaitaire V1)
// ============================================================================

/**
 * Catalogue forfaitaire V1 (€ TTC, prix marché Bretagne 2026).
 * Phase 8+ : lookup `brh_dpe_solutions` Supabase (Batichiffrage).
 */
export const PRIX_GESTES = {
  isolation_murs_iti_120: { unit: 'm2', prixTtc: 75 }, // €/m² mur
  isolation_murs_iti_200: { unit: 'm2', prixTtc: 95 },
  isolation_murs_ite_140: { unit: 'm2', prixTtc: 145 },
  isolation_murs_ite_200: { unit: 'm2', prixTtc: 175 },
  isolation_combles_perdus_300: { unit: 'm2', prixTtc: 35 }, // €/m² PH
  isolation_toiture_200: { unit: 'm2', prixTtc: 110 }, // sarking
  isolation_plancher_bas_120: { unit: 'm2', prixTtc: 45 },
  fenetres_pvc_double_vir: { unit: 'm2', prixTtc: 850 }, // €/m² fenêtre
  fenetres_pvc_triple: { unit: 'm2', prixTtc: 1100 },
  pac_air_eau_basse_temp: { unit: 'forfait', prixTtc: 14000 },
  pac_eau_eau_geothermie: { unit: 'forfait', prixTtc: 22000 },
  chaudiere_granules_bois: { unit: 'forfait', prixTtc: 18000 },
  cet_thermodynamique: { unit: 'forfait', prixTtc: 4500 },
  vmc_double_flux_recup: { unit: 'forfait', prixTtc: 6500 },
  plancher_chauffant_eau: { unit: 'm2', prixTtc: 95 }, // €/m² plancher
  pv_3kwc: { unit: 'forfait', prixTtc: 9500 },
  pv_6kwc: { unit: 'forfait', prixTtc: 16000 },
} as const

export type GesteId = keyof typeof PRIX_GESTES

export interface GesteDelta {
  geste: GesteId
  surface?: number // m² si applicable
  forfait?: number // remplace prixTtc si fourni
}

export function calcCoutGeste(delta: GesteDelta): number {
  const tarif = PRIX_GESTES[delta.geste]
  if (!tarif) return 0
  if (delta.forfait != null) return delta.forfait
  if (tarif.unit === 'forfait') return tarif.prixTtc
  return (delta.surface ?? 0) * tarif.prixTtc
}

export function calcCoutTotal(gestes: GesteDelta[]): number {
  return gestes.reduce((sum, g) => sum + calcCoutGeste(g), 0)
}

// ============================================================================
// Aides simplifiées (MPR + CEE forfaitaire par geste, V1)
// ============================================================================

/**
 * Aides forfaitaires par geste (V1 Bretagne 2026 — simplifié).
 * Phase 8 : moteur aides complet avec décile MPR + ampleur + tva 5.5%.
 */
const AIDES_PAR_GESTE: Record<GesteId, { mpr: number; cee: number }> = {
  isolation_murs_iti_120: { mpr: 25, cee: 12 }, // €/m² mur
  isolation_murs_iti_200: { mpr: 25, cee: 14 },
  isolation_murs_ite_140: { mpr: 25, cee: 16 },
  isolation_murs_ite_200: { mpr: 25, cee: 18 },
  isolation_combles_perdus_300: { mpr: 11, cee: 10 },
  isolation_toiture_200: { mpr: 25, cee: 20 },
  isolation_plancher_bas_120: { mpr: 25, cee: 12 },
  fenetres_pvc_double_vir: { mpr: 80, cee: 35 },
  fenetres_pvc_triple: { mpr: 80, cee: 40 },
  pac_air_eau_basse_temp: { mpr: 5000, cee: 4500 },
  pac_eau_eau_geothermie: { mpr: 11000, cee: 4500 },
  chaudiere_granules_bois: { mpr: 8000, cee: 3500 },
  cet_thermodynamique: { mpr: 1200, cee: 600 },
  vmc_double_flux_recup: { mpr: 0, cee: 600 },
  plancher_chauffant_eau: { mpr: 0, cee: 0 },
  pv_3kwc: { mpr: 1140, cee: 0 }, // prime autoconso
  pv_6kwc: { mpr: 1530, cee: 0 },
}

export function calcAidesGeste(delta: GesteDelta): { mpr: number; cee: number; total: number } {
  const aides = AIDES_PAR_GESTE[delta.geste]
  if (!aides) return { mpr: 0, cee: 0, total: 0 }
  const tarif = PRIX_GESTES[delta.geste]
  const surface = delta.surface ?? 0
  const mpr = tarif.unit === 'forfait' ? aides.mpr : aides.mpr * surface
  const cee = tarif.unit === 'forfait' ? aides.cee : aides.cee * surface
  return { mpr, cee, total: mpr + cee }
}

export function calcAidesTotal(gestes: GesteDelta[]): { mpr: number; cee: number; total: number } {
  return gestes.reduce(
    (acc, g) => {
      const a = calcAidesGeste(g)
      return { mpr: acc.mpr + a.mpr, cee: acc.cee + a.cee, total: acc.total + a.total }
    },
    { mpr: 0, cee: 0, total: 0 },
  )
}

// ============================================================================
// Payback simple (ADR-005, USP BRH)
// ============================================================================

/**
 * Prix moyen pondéré de l'énergie (€/kWh EF).
 * Source : tarifs réglementés FR 2026 (approx).
 */
const PRIX_KWH_EF: Record<string, number> = {
  electricite: 0.27,
  gaz_naturel: 0.13,
  fioul: 0.16,
  propane: 0.18,
  bois_buche: 0.05,
  granules_bois: 0.075,
  reseau_chaleur: 0.12,
}

export interface PaybackInput {
  baseDpe: DpeResult
  varianteDpe: DpeResult
  coutTtcEuros: number
  aidesTotalEuros: number
  energieDominante: keyof typeof PRIX_KWH_EF
}

export interface PaybackResult {
  paybackAnnees: number | null
  economieKwhEfAn: number
  economieEurosAn: number
  resteACharge: number
  alerteSuperieur30Ans: boolean
}

export function calcPayback(opts: PaybackInput): PaybackResult {
  const economieKwh = opts.baseDpe.consoEfTotaleKwhAn - opts.varianteDpe.consoEfTotaleKwhAn
  const prixKwh = PRIX_KWH_EF[opts.energieDominante] ?? 0.15
  const economieEuros = Math.max(0, economieKwh * prixKwh)
  const resteACharge = Math.max(0, opts.coutTtcEuros - opts.aidesTotalEuros)

  if (economieEuros <= 0 || resteACharge <= 0) {
    return {
      paybackAnnees: null,
      economieKwhEfAn: economieKwh,
      economieEurosAn: economieEuros,
      resteACharge,
      alerteSuperieur30Ans: false,
    }
  }

  const paybackAnnees = resteACharge / economieEuros
  return {
    paybackAnnees,
    economieKwhEfAn: economieKwh,
    economieEurosAn: economieEuros,
    resteACharge,
    alerteSuperieur30Ans: paybackAnnees > 30,
  }
}

// ============================================================================
// Templates de scénarios (5 packs prédéfinis)
// ============================================================================

export interface ScenarioTemplate {
  id: string
  label: string
  description: string
  gestes: (base: AuditInputs) => GesteDelta[]
  applyDelta: (base: AuditInputs) => Partial<AuditInputs>
}

/**
 * Surface murs depuis l'audit (le 1er mur déclaré, ou estimation).
 */
function surfaceMurs(base: AuditInputs): number {
  const m = base.bati.parois.find((p) => p.type === 'mur')
  if (m) return m.surface
  // Estimation : √Sh × 4 × Hsp × 0.85
  const sh = base.bati.surfaceHabitable
  const hsp = base.bati.hauteurSousPlafond ?? 2.5
  return Math.sqrt(sh) * 4 * hsp * 0.85
}

function surfaceToit(base: AuditInputs): number {
  const ph = base.bati.parois.find((p) => p.type === 'plancher_haut' || p.type === 'toiture')
  return ph?.surface ?? base.bati.surfaceHabitable / (base.bati.nombreNiveaux ?? 1)
}

function surfacePlancherBas(base: AuditInputs): number {
  const pb = base.bati.parois.find((p) => p.type === 'plancher_bas')
  return pb?.surface ?? base.bati.surfaceHabitable / (base.bati.nombreNiveaux ?? 1)
}

function totalSurfaceFenetres(base: AuditInputs): number {
  return base.bati.ouvertures
    .filter((o) => o.type !== 'porte')
    .reduce((s, o) => s + o.surface, 0)
}

function withParoisIso(
  base: AuditInputs,
  type: ParoiInput['type'],
  isolation: ParoiInput['isolation'],
): ParoiInput[] {
  return base.bati.parois.map((p) => (p.type === type ? { ...p, isolation } : p))
}

function withFenetres(base: AuditInputs, vitrage: OuvertureInput['vitrage']): OuvertureInput[] {
  return base.bati.ouvertures.map((o) =>
    o.type === 'porte' ? o : { ...o, menuiserie: 'pvc' as const, vitrage, vir: vitrage !== 'simple' },
  )
}

export const SCENARIOS_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'isolation_combles',
    label: 'Isolation combles',
    description: 'Isolation 300mm soufflé en combles perdus uniquement.',
    gestes: (base) => [
      { geste: 'isolation_combles_perdus_300', surface: surfaceToit(base) },
    ],
    applyDelta: (base) => ({
      bati: {
        ...base.bati,
        parois: withParoisIso(base, 'plancher_haut', { type: 'iti', epaisseur: 300, lambda: 0.04 }),
      },
    }),
  },
  {
    id: 'enveloppe_iti',
    label: 'Enveloppe ITI',
    description: 'Isolation murs ITI 120mm + combles 300mm + plancher bas 120mm.',
    gestes: (base) => [
      { geste: 'isolation_murs_iti_120', surface: surfaceMurs(base) },
      { geste: 'isolation_combles_perdus_300', surface: surfaceToit(base) },
      { geste: 'isolation_plancher_bas_120', surface: surfacePlancherBas(base) },
    ],
    applyDelta: (base) => ({
      bati: {
        ...base.bati,
        parois: base.bati.parois.map((p) => {
          if (p.type === 'mur') return { ...p, isolation: { type: 'iti' as const, epaisseur: 120, lambda: 0.038 } }
          if (p.type === 'plancher_haut') return { ...p, isolation: { type: 'iti' as const, epaisseur: 300, lambda: 0.04 } }
          if (p.type === 'plancher_bas') return { ...p, isolation: { type: 'iti' as const, epaisseur: 120, lambda: 0.04 } }
          return p
        }),
      },
    }),
  },
  {
    id: 'isolation_pac',
    label: 'Isolation + PAC air/eau',
    description: 'Enveloppe ITE 140mm + PAC air/eau basse température + ECS thermodynamique.',
    gestes: (base) => [
      { geste: 'isolation_murs_ite_140', surface: surfaceMurs(base) },
      { geste: 'isolation_combles_perdus_300', surface: surfaceToit(base) },
      { geste: 'pac_air_eau_basse_temp' },
      { geste: 'cet_thermodynamique' },
    ],
    applyDelta: (base) => ({
      bati: {
        ...base.bati,
        parois: base.bati.parois.map((p) => {
          if (p.type === 'mur') return { ...p, isolation: { type: 'ite' as const, epaisseur: 140, lambda: 0.032 } }
          if (p.type === 'plancher_haut') return { ...p, isolation: { type: 'iti' as const, epaisseur: 300, lambda: 0.04 } }
          return p
        }),
      },
      equipements: {
        ...base.equipements,
        chauffage: {
          generateur: 'pac_air_eau' as const,
          emetteur: 'radiateur_eau' as const,
          anneeInstallation: new Date().getFullYear(),
          regulation: true,
        },
        ecs: { generateur: 'cet' as const, stockageL: 200, anneeInstallation: new Date().getFullYear() },
      },
    }),
  },
  {
    id: 'renovation_globale',
    label: 'Rénovation globale',
    description: 'ITE 200mm + toiture 200mm + plancher bas 120mm + fenêtres triple + PAC eau/eau + PCBT + VMC DF + CET.',
    gestes: (base) => [
      { geste: 'isolation_murs_ite_200', surface: surfaceMurs(base) },
      { geste: 'isolation_toiture_200', surface: surfaceToit(base) },
      { geste: 'isolation_plancher_bas_120', surface: surfacePlancherBas(base) },
      { geste: 'fenetres_pvc_triple', surface: totalSurfaceFenetres(base) },
      { geste: 'pac_eau_eau_geothermie' },
      { geste: 'plancher_chauffant_eau', surface: base.bati.surfaceHabitable },
      { geste: 'vmc_double_flux_recup' },
      { geste: 'cet_thermodynamique' },
    ],
    applyDelta: (base) => ({
      bati: {
        ...base.bati,
        inertie: 'LOURDE' as const,
        parois: base.bati.parois.map((p) => {
          if (p.type === 'mur') return { ...p, isolation: { type: 'ite' as const, epaisseur: 200, lambda: 0.032 } }
          if (p.type === 'plancher_haut') return { ...p, isolation: { type: 'iti' as const, epaisseur: 200, lambda: 0.035 } }
          if (p.type === 'plancher_bas') return { ...p, isolation: { type: 'iti' as const, epaisseur: 120, lambda: 0.04 } }
          return p
        }),
        ouvertures: withFenetres(base, 'triple'),
      },
      equipements: {
        ...base.equipements,
        chauffage: {
          generateur: 'pac_eau_eau' as const,
          emetteur: 'plancher_chauffant' as const,
          anneeInstallation: new Date().getFullYear(),
          regulation: true,
        },
        ecs: { generateur: 'cet' as const, stockageL: 200, anneeInstallation: new Date().getFullYear() },
        ventilation: 'vmc_double_flux_avec_recup' as const,
      },
    }),
  },
  {
    id: 'autonomie_pv',
    label: 'Rénovation globale + PV',
    description: 'Rénovation globale + 6 kWc photovoltaïque autoconsommation.',
    gestes: (base) => {
      const reno = SCENARIOS_TEMPLATES.find((s) => s.id === 'renovation_globale')!.gestes(base)
      return [...reno, { geste: 'pv_6kwc' }]
    },
    applyDelta: (base) => {
      const reno = SCENARIOS_TEMPLATES.find((s) => s.id === 'renovation_globale')!.applyDelta(base)
      return {
        ...reno,
        equipements: {
          ...(reno.equipements ?? base.equipements),
          photovoltaique: { puissance: 6, orientation: 'sud', inclinaison: 30 },
        },
      }
    },
  },
]

// ============================================================================
// Mapping gestes Phase 7 → MPR (Phase 8) + ÉcoPTZ
// ============================================================================

/**
 * Mappe un GesteId interne (variantes) vers le GesteMprMonoId du moteur aides.
 * `null` si le geste n'est pas éligible MPR mono-geste (ex: plancher chauffant, PV).
 */
const GESTE_TO_MPR: Record<GesteId, GesteMprMonoId | null> = {
  isolation_murs_iti_120: 'isolation_murs_iti',
  isolation_murs_iti_200: 'isolation_murs_iti',
  isolation_murs_ite_140: 'isolation_murs_ite',
  isolation_murs_ite_200: 'isolation_murs_ite',
  isolation_combles_perdus_300: 'isolation_combles_perdus',
  isolation_toiture_200: 'isolation_toiture',
  isolation_plancher_bas_120: 'isolation_plancher_bas',
  fenetres_pvc_double_vir: 'fenetres_pvc_double_vir',
  fenetres_pvc_triple: 'fenetres_pvc_triple',
  pac_air_eau_basse_temp: 'pac_air_eau',
  pac_eau_eau_geothermie: 'pac_eau_eau',
  chaudiere_granules_bois: 'chaudiere_granules_bois',
  cet_thermodynamique: 'cet_thermodynamique',
  vmc_double_flux_recup: 'vmc_double_flux_recup',
  plancher_chauffant_eau: null, // intégré au PCBT-PAC, pas une aide séparée
  pv_3kwc: null, // prime autoconso ailleurs (V1)
  pv_6kwc: null,
}

/**
 * Mappe un GesteId vers la catégorie ÉcoPTZ.
 */
const GESTE_TO_ECOPTZ: Record<GesteId, CategorieTravaux | null> = {
  isolation_murs_iti_120: 'isolation_murs',
  isolation_murs_iti_200: 'isolation_murs',
  isolation_murs_ite_140: 'isolation_murs',
  isolation_murs_ite_200: 'isolation_murs',
  isolation_combles_perdus_300: 'isolation_toiture',
  isolation_toiture_200: 'isolation_toiture',
  isolation_plancher_bas_120: 'isolation_plancher_bas',
  fenetres_pvc_double_vir: 'menuiseries',
  fenetres_pvc_triple: 'menuiseries',
  pac_air_eau_basse_temp: 'chauffage_ecs',
  pac_eau_eau_geothermie: 'chauffage_ecs',
  chaudiere_granules_bois: 'chauffage_ecs',
  cet_thermodynamique: 'chauffage_ecs',
  vmc_double_flux_recup: 'ventilation',
  plancher_chauffant_eau: 'chauffage_ecs',
  pv_3kwc: null,
  pv_6kwc: null,
}

export function gesteToMprId(g: GesteId): GesteMprMonoId | null {
  return GESTE_TO_MPR[g]
}

export function gesteToEcoPtzCategory(g: GesteId): CategorieTravaux | null {
  return GESTE_TO_ECOPTZ[g]
}

// ============================================================================
// Calcul aides détaillé (Phase 8 : MPR + CEE + ÉcoPTZ + plafonds)
// ============================================================================

export interface AidesContext {
  couleur: CouleurMPR
  /** Zone climatique de l'audit (H1A, H2A, H3, ...). */
  zoneClimat: string
  /** Saut de classes DPE pour mode ÉcoPTZ. */
  sautClassesDpe?: number
  /** True si rénovation Ampleur (≥2 gestes + saut ≥ 2 classes). */
  isGlobalAmpleur?: boolean
}

/**
 * Calcul aides détaillé pour une liste de gestes (avec mapping interne).
 *
 * Phase 9 : si baseDpe + varianteDpe + base inputs sont fournis, calcule
 * aussi MPR Ampleur (parcours accompagné) et choisit MAX(mono, ampleur).
 */
export function calcAidesDetaillees(
  gestes: GesteDelta[],
  ctx: AidesContext & {
    /** Inputs base (pour année logement). */
    baseInputs?: AuditInputs
    /** DPE base (pour étiquette avant). */
    baseDpe?: DpeResult
    /** DPE variante (pour étiquette après). */
    varianteDpe?: DpeResult
  },
): AidesScenarioResult {
  // Convertir les gestes vers le format attendu par le moteur aides
  const aidesGestes = gestes
    .map((g) => {
      const mprId = gesteToMprId(g.geste)
      const ecoPtzCat = gesteToEcoPtzCategory(g.geste)
      if (!mprId || !ecoPtzCat) return null
      const tarif = PRIX_GESTES[g.geste]
      const surface = g.surface
      const coutTtc = g.forfait ?? (tarif.unit === 'forfait' ? tarif.prixTtc : (surface ?? 0) * tarif.prixTtc)
      // HT depuis TTC en TVA 5.5% (rénovation énergétique)
      const coutHtEuros = coutTtc / 1.055
      return {
        geste: mprId,
        surface,
        coutHtEuros,
        categorieEcoPtz: ecoPtzCat,
      }
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)

  // Construit le contexte MPR Ampleur si on a baseDpe + varianteDpe + inputs
  let ampleurContext: import('../aides').AidesScenarioInput['ampleurContext'] = undefined
  if (ctx.baseDpe && ctx.varianteDpe && ctx.baseInputs) {
    const nbGestesIso = countGestesIsolation(gestes)
    const anneeLogement = periodeToAnnee(ctx.baseInputs.bati.periodeConstruction)
    ampleurContext = {
      classeAvant: ctx.baseDpe.etiquetteDpe,
      classeApres: ctx.varianteDpe.etiquetteDpe,
      gesAvant: ctx.baseDpe.gesKgCo2M2An,
      gesApres: ctx.varianteDpe.gesKgCo2M2An,
      nbGestesIso,
      anneeLogement,
    }
  }

  return calcAidesScenario({
    couleur: ctx.couleur,
    zoneClimat: zoneClimatToCEE(ctx.zoneClimat),
    gestes: aidesGestes,
    sautClassesDpe: ctx.sautClassesDpe,
    isGlobalAmpleur: ctx.isGlobalAmpleur,
    ampleurContext,
  })
}

// ============================================================================
// Compute scenario complet (un seul appel)
// ============================================================================

export interface ScenarioComputed {
  template: ScenarioTemplate
  delta: Partial<AuditInputs>
  inputs: AuditInputs
  result: DpeResult
  gestes: GesteDelta[]
  coutTtcEuros: number
  /** Aides forfaitaires V1 (gardé pour rétrocompat). */
  aidesEuros: { mpr: number; cee: number; total: number }
  /** Aides détaillées Phase 8 : présent uniquement si AidesContext fourni. */
  aidesDetaillees?: AidesScenarioResult
  payback: PaybackResult
}

export function computeScenario(
  template: ScenarioTemplate,
  base: AuditInputs,
  baseDpe: DpeResult,
  aidesCtx?: Partial<AidesContext>,
): ScenarioComputed {
  const delta = template.applyDelta(base)
  const inputs = applyDeltaToInputs(base, delta)
  const result = computeDpe(inputs)

  const gestes = template.gestes(base)
  const coutTtcEuros = calcCoutTotal(gestes)
  // Forfaits Phase 7 (gardés pour fallback / rétrocompat UI ancienne)
  const aidesEuros = calcAidesTotal(gestes)

  // Énergie dominante avant rénovation (pour calcul économies)
  const energieDominante = (() => {
    const ch = base.equipements.chauffage.generateur
    if (ch.includes('gaz')) return 'gaz_naturel'
    if (ch.includes('fioul')) return 'fioul'
    if (ch.includes('granules')) return 'granules_bois'
    if (ch.includes('bois')) return 'bois_buche'
    return 'electricite'
  })()

  // Aides détaillées Phase 8+9 si context fourni (avec couleur + zone)
  let aidesDetaillees: AidesScenarioResult | undefined
  let aidesTotalEffective = aidesEuros.total
  if (aidesCtx?.couleur) {
    aidesDetaillees = calcAidesDetaillees(gestes, {
      couleur: aidesCtx.couleur,
      zoneClimat: aidesCtx.zoneClimat ?? baseDpe.hypotheses.zoneClimatique,
      sautClassesDpe: aidesCtx.sautClassesDpe,
      isGlobalAmpleur: aidesCtx.isGlobalAmpleur,
      // Phase 9 : context MPR Ampleur (avant/après + inputs)
      baseInputs: base,
      baseDpe,
      varianteDpe: result,
    })
    aidesTotalEffective = aidesDetaillees.aidesTotalSubventionsEuros
  }

  const payback = calcPayback({
    baseDpe,
    varianteDpe: result,
    coutTtcEuros,
    aidesTotalEuros: aidesTotalEffective,
    energieDominante,
  })

  return {
    template,
    delta,
    inputs,
    result,
    gestes,
    coutTtcEuros,
    aidesEuros,
    aidesDetaillees,
    payback,
  }
}

export function computeAllScenarios(
  base: AuditInputs,
  baseDpe: DpeResult,
  aidesCtx?: Partial<AidesContext>,
): ScenarioComputed[] {
  return SCENARIOS_TEMPLATES.map((tpl) => computeScenario(tpl, base, baseDpe, aidesCtx))
}
