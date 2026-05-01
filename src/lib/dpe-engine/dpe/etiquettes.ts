/**
 * Étiquettes DPE — classification CEP / GES + double seuil.
 *
 * Source : CapRénov+ `application/eco/energie/EtiquetteEnergie.as` +
 * `SeuilsEtiquetteEnergie.as`.
 * Wikis :
 *   - 04-dpe-etiquettes/seuils-dpe.md
 *   - 04-dpe-etiquettes/interpolation-surface.md
 *   - 04-dpe-etiquettes/etiquette-energie-cep.md
 *   - 04-dpe-etiquettes/etiquette-climat-ges.md
 *   - 04-dpe-etiquettes/double-seuil.md
 *
 * Algorithme :
 *   1. Lookup seuils par surface (interpolation linéaire) + altitude/zone clim
 *   2. Classify CEP → letter (A..G) via comparaison stricte `<`
 *   3. Classify GES → letter
 *   4. Étiquette finale = max(CEP, GES) (la pire des deux)
 */

import type { EtiquetteDpe, ZoneClimatique } from '../constants'
import { ETIQUETTES_DPE } from '../constants'
import seuilsJson from '../data/SeuilsDPE.json'

interface SeuilsRow {
  id: number
  critere_altitude_zone_clim: number
  surface: number
  cep_a: number
  ges_a: number
  cep_b: number
  ges_b: number
  cep_c: number
  ges_c: number
  cep_d: number
  ges_d: number
  cep_e: number
  ges_e: number
  cep_f: number
  ges_f: number
}

const SEUILS_ALL = (seuilsJson as { seuils: SeuilsRow[] }).seuils

const SURFACE_MIN = Math.min(...SEUILS_ALL.map((r) => r.surface))
const SURFACE_MAX = Math.max(...SEUILS_ALL.map((r) => r.surface))

/**
 * Critère altitude/zone clim : flag=1 si altitude > 800m ET zone ∈ {H1B,H1C,H2D}.
 */
function getCritere(altitude: number, zone: ZoneClimatique): 0 | 1 {
  if (altitude > 800 && (zone === 'H1B' || zone === 'H1C' || zone === 'H2D')) return 1
  return 0
}

/**
 * Lookup seuils row pour une surface entière + critère.
 */
function lookupRow(surface: number, critere: 0 | 1): SeuilsRow | undefined {
  return SEUILS_ALL.find((r) => r.surface === surface && r.critere_altitude_zone_clim === critere)
}

export interface SeuilsClassifies {
  A: number
  B: number
  C: number
  D: number
  E: number
  F: number
}

/**
 * Récupère les seuils interpolés pour CEP ou GES.
 */
export function getSeuils(
  surface: number,
  altitude: number,
  zone: ZoneClimatique,
  type: 'CEP' | 'GES',
): SeuilsClassifies | null {
  const critere = getCritere(altitude, zone)
  const sMin = Math.max(SURFACE_MIN, Math.min(SURFACE_MAX, Math.floor(surface)))
  const sMax = Math.max(SURFACE_MIN, Math.min(SURFACE_MAX, Math.ceil(surface)))

  const rowMin = lookupRow(sMin, critere) ?? lookupRow(sMin, 0)
  const rowMax = lookupRow(sMax, critere) ?? lookupRow(sMax, 0)
  if (!rowMin || !rowMax) return null

  const prefix = type === 'CEP' ? 'cep' : 'ges'
  const interp = (a: number, b: number) =>
    sMin === sMax ? a : a + ((b - a) * (surface - sMin)) / (sMax - sMin)

  type Key = `${'cep' | 'ges'}_${'a' | 'b' | 'c' | 'd' | 'e' | 'f'}`
  const get = (letter: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'): number =>
    interp(
      (rowMin[`${prefix}_${letter}` as Key] as number),
      (rowMax[`${prefix}_${letter}` as Key] as number),
    )

  return {
    A: get('a'),
    B: get('b'),
    C: get('c'),
    D: get('d'),
    E: get('e'),
    F: get('f'),
  }
}

/**
 * Classification stricte d'une valeur CEP ou GES en lettre A..G.
 * Comparaison `<` : si value < seuilA → A, etc., sinon G.
 */
export function classifyValue(value: number, seuils: SeuilsClassifies): EtiquetteDpe {
  if (value < seuils.A) return 'A'
  if (value < seuils.B) return 'B'
  if (value < seuils.C) return 'C'
  if (value < seuils.D) return 'D'
  if (value < seuils.E) return 'E'
  if (value < seuils.F) return 'F'
  return 'G'
}

/**
 * Mapping lettre → ordre numérique (1..7).
 */
export const ORDER_DPE: Record<EtiquetteDpe, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7,
}

/**
 * Étiquette DPE finale = max(CEP, GES) (la pire des deux).
 *
 * Source : CapRénov+ `EtiquetteEnergie.as:14-62` + arrêté DPE 2021.
 */
export function dpeFinal(cep: EtiquetteDpe, ges: EtiquetteDpe): EtiquetteDpe {
  const idx = Math.max(ORDER_DPE[cep], ORDER_DPE[ges])
  return ETIQUETTES_DPE[idx - 1]
}

/**
 * Classification complète : retourne CEP, GES, et étiquette finale.
 */
export interface DpeClassification {
  etiquetteEnergie: EtiquetteDpe
  etiquetteClimat: EtiquetteDpe
  etiquetteDpe: EtiquetteDpe
  seuilsCEP: SeuilsClassifies | null
  seuilsGES: SeuilsClassifies | null
}

export function classifyDpe(
  cepValue: number,
  gesValue: number,
  surface: number,
  altitude: number,
  zone: ZoneClimatique,
): DpeClassification {
  const seuilsCEP = getSeuils(surface, altitude, zone, 'CEP')
  const seuilsGES = getSeuils(surface, altitude, zone, 'GES')

  // Si seuils introuvables, fallback à G (sécurité)
  const etiquetteEnergie = seuilsCEP ? classifyValue(cepValue, seuilsCEP) : 'G'
  const etiquetteClimat = seuilsGES ? classifyValue(gesValue, seuilsGES) : 'G'
  const etiquetteDpe = dpeFinal(etiquetteEnergie, etiquetteClimat)

  return {
    etiquetteEnergie,
    etiquetteClimat,
    etiquetteDpe,
    seuilsCEP,
    seuilsGES,
  }
}

/**
 * Saut de classes DPE entre deux étiquettes (avant → après rénovation).
 * Retourne un nombre positif si amélioration, négatif si dégradation.
 */
export function calcSautClasses(avant: EtiquetteDpe, apres: EtiquetteDpe): number {
  return ORDER_DPE[avant] - ORDER_DPE[apres]
}

/**
 * Détecte si le logement est une passoire thermique (étiquette F ou G).
 * Source : loi Climat et Résilience 2021.
 */
export function isPassoireThermique(etiquette: EtiquetteDpe): boolean {
  return etiquette === 'F' || etiquette === 'G'
}
