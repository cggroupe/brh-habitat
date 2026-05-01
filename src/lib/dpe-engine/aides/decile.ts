/**
 * Catégorisation revenus → couleur MaPrimeRénov'.
 *
 * Source : caprenov-reverse/wiki/06-aides-financieres/categorisation-revenus.md
 * Plafonds officiels 2024-2026 (precarite.json datapack CapRénov+).
 *
 * 4 couleurs MPR :
 *   - Bleu = Très modeste (max 25 393 € hors-IDF / 35 270 € IDF pour 2 personnes)
 *   - Jaune = Modeste
 *   - Violet = Intermédiaire (uniquement pour les aides ANAH, pas CEE)
 *   - Rose = Non modeste (exclu mono-geste, accès ampleur uniquement)
 */

export type CouleurMPR = 'bleu' | 'jaune' | 'violet' | 'rose'
export type ZoneGeo = 'idf' | 'region'

/** Plafonds en € : [1p, 2p, 3p, 4p, 5p, +inc/p_suppl]. */
const PLAFONDS_HORS_IDF = {
  tres_modeste: [17363, 25393, 30540, 35676, 40835, 5151],
  modeste: [22259, 32553, 39148, 45735, 52348, 6598],
  intermediaire: [31185, 45842, 55196, 64550, 73907, 9357],
} as const

const PLAFONDS_IDF = {
  tres_modeste: [24031, 35270, 42357, 49455, 56580, 7116],
  modeste: [29253, 42933, 51564, 60208, 68877, 8663],
  intermediaire: [40851, 60051, 71846, 84562, 96817, 12256],
} as const

/**
 * Plafond pour un nombre de personnes donné, avec extrapolation linéaire si > 5p.
 */
function getPlafond(table: readonly number[], nbPersonnes: number): number {
  if (nbPersonnes < 1) return Number.POSITIVE_INFINITY
  if (nbPersonnes <= 5) return table[nbPersonnes - 1]
  // > 5 : plafond_5 + increment × (n - 5)
  return table[4] + table[5] * (nbPersonnes - 5)
}

/**
 * Détermine si une commune est en zone IDF (Île-de-France).
 * Codes INSEE IDF : départements 75, 77, 78, 91, 92, 93, 94, 95.
 */
export function isIdf(codeInseeOrDept: string): boolean {
  const dept = codeInseeOrDept.slice(0, 2)
  return ['75', '77', '78', '91', '92', '93', '94', '95'].includes(dept)
}

export interface DecileInput {
  revenuFiscalReference: number
  nbPersonnes: number
  zone?: ZoneGeo
  codeInsee?: string
}

export interface DecileResult {
  couleur: CouleurMPR
  niveau: 'tres_modeste' | 'modeste' | 'intermediaire' | 'non_modeste'
  zone: ZoneGeo
  plafonds: {
    tresModeste: number
    modeste: number
    intermediaire: number
  }
}

/**
 * Calcule la couleur MaPrimeRénov' d'un foyer.
 */
export function calcCouleurMpr(input: DecileInput): DecileResult {
  const zone: ZoneGeo = input.zone ?? (input.codeInsee && isIdf(input.codeInsee) ? 'idf' : 'region')
  const table = zone === 'idf' ? PLAFONDS_IDF : PLAFONDS_HORS_IDF
  const n = Math.max(1, Math.floor(input.nbPersonnes))

  const seuilTresModeste = getPlafond(table.tres_modeste, n)
  const seuilModeste = getPlafond(table.modeste, n)
  const seuilIntermediaire = getPlafond(table.intermediaire, n)

  const rfr = input.revenuFiscalReference
  let couleur: CouleurMPR = 'rose'
  let niveau: DecileResult['niveau'] = 'non_modeste'
  if (rfr <= seuilTresModeste) {
    couleur = 'bleu'
    niveau = 'tres_modeste'
  } else if (rfr <= seuilModeste) {
    couleur = 'jaune'
    niveau = 'modeste'
  } else if (rfr <= seuilIntermediaire) {
    couleur = 'violet'
    niveau = 'intermediaire'
  }

  return {
    couleur,
    niveau,
    zone,
    plafonds: {
      tresModeste: seuilTresModeste,
      modeste: seuilModeste,
      intermediaire: seuilIntermediaire,
    },
  }
}

/**
 * Helper pour calculer la couleur depuis un AuditInputs.foyer.
 */
export function calcCouleurFromAudit(input: {
  geo: { codeInsee: string }
  foyer?: { nbAdultes?: number; nbEnfants?: number; revenuFiscalReference?: number; decileMpr?: CouleurMPR }
}): DecileResult | null {
  if (!input.foyer || input.foyer.revenuFiscalReference === undefined) return null
  const nbPersonnes = (input.foyer.nbAdultes ?? 0) + (input.foyer.nbEnfants ?? 0)
  if (nbPersonnes < 1) return null
  return calcCouleurMpr({
    revenuFiscalReference: input.foyer.revenuFiscalReference,
    nbPersonnes,
    codeInsee: input.geo.codeInsee,
  })
}
