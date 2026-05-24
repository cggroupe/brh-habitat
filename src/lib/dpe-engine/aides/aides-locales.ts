/**
 * Aides locales (régionales / départementales / intercommunales / communales).
 *
 * Phase 10 — ADR-014 (Bretagne V1).
 *
 * Lookup à partir d'un code INSEE :
 * 1. Région (53 = Bretagne)
 * 2. Département (22, 29, 35, 56)
 * 3. Intercommunalité (EPCI) — V1 : Brest Métropole, Rennes Métropole, etc.
 * 4. Commune (V1 : pas implémenté)
 *
 * Cumul avec aides nationales (MPR, CEE, ÉcoPTZ) : selon flags `cumul_*` de chaque aide.
 *
 * V1 : seed initial Bretagne (10 aides). Phase 10.1+ : extension France via ANIL.
 */

import { supabaseTyped } from '@/lib/supabase'
import type { CouleurMPR } from './decile'

export type NiveauAide = 'national' | 'regional' | 'departement' | 'intercommune' | 'commune'

export interface AideLocale {
  id: number
  programme: string
  organisme: string
  niveau: NiveauAide
  code_geo: string
  geste_id: string
  forfait_euros: number | null
  taux_pct: number | null
  plafond_euros: number | null
  couleurs_eligibles: CouleurMPR[] | null
  saut_dpe_min: number | null
  cumul_mpr: boolean
  cumul_cee: boolean
  cumul_eco_ptz: boolean
  url_officielle: string | null
  notes: string | null
  active: boolean
}

/**
 * Mapping INSEE communes → département.
 * Bretagne : 22, 29, 35, 56.
 */
export function deptFromInsee(insee: string): string {
  if (insee.startsWith('2A') || insee.startsWith('2B')) return insee.substring(0, 2)
  if (insee.startsWith('97')) return insee.substring(0, 3)
  return insee.substring(0, 2)
}

/**
 * Mapping département → région INSEE.
 * (V1 : Bretagne uniquement)
 */
const REGIONS_PAR_DEPT: Record<string, string> = {
  '22': '53', '29': '53', '35': '53', '56': '53', // Bretagne
  '44': '52', '49': '52', '53': '52', '72': '52', '85': '52', // Pays de la Loire
}

export function regionFromInsee(insee: string): string | null {
  const dept = deptFromInsee(insee)
  return REGIONS_PAR_DEPT[dept] ?? null
}

/**
 * Mapping commune INSEE → EPCI (intercommunalité).
 * V1 : table partielle Bretagne (à étendre via insee data API).
 *
 * Source : https://www.insee.fr/fr/information/2510634 (annuaire EPCI 2026)
 */
const EPCI_PAR_COMMUNE: Record<string, string> = {
  // Brest Métropole (8 communes)
  '29019': '242900314', // Brest
  '29022': '242900314', // Plouzané
  '29032': '242900314', // Le Relecq-Kerhuon
  '29069': '242900314', // Guipavas
  '29075': '242900314', // Gouesnou
  '29089': '242900314', // Bohars
  '29151': '242900314', // Plougastel-Daoulas
  '29220': '242900314', // Plouzané

  // Rennes Métropole (43 communes — extrait V1)
  '35238': '243500139', // Rennes
  '35055': '243500139', // Cesson-Sévigné
  '35047': '243500139', // Bruz
  '35131': '243500139', // Le Rheu
  '35025': '243500139', // Betton
  '35099': '243500139', // L'Hermitage
  '35206': '243500139', // Pacé
  '35216': '243500139', // Pont-Péan
  '35275': '243500139', // Saint-Grégoire
  '35334': '243500139', // Vezin-le-Coquet

  // Lorient Agglomération
  '56121': '200042174', // Lorient
  '56178': '200042174', // Plœmeur
  '56193': '200042174', // Pont-Scorff
  '56098': '200042174', // Hennebont

  // Quimper Bretagne Occidentale
  '29232': '242900645', // Quimper
  '29067': '242900645', // Ergué-Gabéric
  '29216': '242900645', // Plomelin
  '29208': '242900645', // Pluguffan
}

export function epciFromInsee(insee: string): string | null {
  return EPCI_PAR_COMMUNE[insee] ?? null
}

/**
 * Récupère toutes les aides locales applicables pour un code INSEE donné.
 *
 * Hiérarchie de niveaux :
 * - Régional (Bretagne)
 * - Départemental (22/29/35/56)
 * - Intercommunal (Brest, Rennes, Lorient, Quimper)
 * - (Communal : V1 non implémenté)
 *
 * Filtre couleur MPR si fournie.
 */
export async function fetchAidesLocales(opts: {
  codeInsee: string
  couleur?: CouleurMPR
}): Promise<AideLocale[]> {
  const dept = deptFromInsee(opts.codeInsee)
  const region = regionFromInsee(opts.codeInsee)
  const epci = epciFromInsee(opts.codeInsee)

  // Construit les conditions OR pour les niveaux
  const orConditions: string[] = []
  if (region) orConditions.push(`and(niveau.eq.regional,code_geo.eq.${region})`)
  orConditions.push(`and(niveau.eq.departement,code_geo.eq.${dept})`)
  if (epci) orConditions.push(`and(niveau.eq.intercommune,code_geo.eq.${epci})`)
  orConditions.push(`and(niveau.eq.commune,code_geo.eq.${opts.codeInsee})`)

  const { data, error } = await supabaseTyped
    .from('brh_aides_locales')
    .select('*')
    .eq('active', true)
    .or(orConditions.join(','))

  if (error) {
    console.warn('fetchAidesLocales:', error.message)
    return []
  }

  // Filtre par couleur si fournie
  let aides = (data ?? []) as AideLocale[]
  if (opts.couleur) {
    aides = aides.filter(
      (a) => !a.couleurs_eligibles || a.couleurs_eligibles.includes(opts.couleur!),
    )
  }

  return aides
}

export interface CalcAidesLocalesInput {
  aides: AideLocale[]
  /** Liste des gestes du scénario (pour matching geste_id). */
  gesteIds: string[]
  /** Coût HT total (pour calcul taux %). */
  coutHtEuros: number
  /** Saut DPE pour critères saut_dpe_min. */
  sautClassesDpe?: number
}

export interface AideLocaleApplied {
  aide: AideLocale
  montantEuros: number
}

export interface CalcAidesLocalesResult {
  appliquees: AideLocaleApplied[]
  totalEuros: number
}

/**
 * Calcule le total des aides locales applicables pour un scénario donné.
 *
 * Règles :
 * - Une aide '*' ou 'renovation_globale' s'applique à toute rénovation
 * - Une aide spécifique (`pac_air_eau`) ne s'applique que si le geste correspondant existe
 * - Critère saut_dpe_min vérifié si fourni
 * - V1 : pas de plafond cumulé entre aides locales (à ajouter Phase 10.1+)
 */
export function calcAidesLocales(input: CalcAidesLocalesInput): CalcAidesLocalesResult {
  const appliquees: AideLocaleApplied[] = []

  for (const aide of input.aides) {
    // Critère saut DPE
    if (aide.saut_dpe_min && (input.sautClassesDpe ?? 0) < aide.saut_dpe_min) continue

    // Critère geste
    const isUniversal = aide.geste_id === '*' || aide.geste_id === 'renovation_globale'
    const matchGeste = isUniversal || input.gesteIds.some((g) => g.startsWith(aide.geste_id))
    if (!matchGeste) continue

    // Calcul montant
    let montant = 0
    if (aide.forfait_euros) {
      montant = aide.forfait_euros
    } else if (aide.taux_pct) {
      montant = (input.coutHtEuros * aide.taux_pct) / 100
    }
    if (aide.plafond_euros) {
      montant = Math.min(montant, aide.plafond_euros)
    }

    if (montant > 0) {
      appliquees.push({ aide, montantEuros: montant })
    }
  }

  return {
    appliquees,
    totalEuros: appliquees.reduce((s, a) => s + a.montantEuros, 0),
  }
}
