/**
 * Mapping département → zone climatique 3CL-DPE.
 * Source : arrêté DPE 2021 + tv.db.zones_climatiques.
 *
 * H1A, H1B, H1C : nord/est froid
 * H2A, H2B, H2C, H2D : tempéré océanique / continental
 * H3 : méditerranéen
 *
 * Pour la Bretagne : 22, 29, 35, 56 → H2A.
 */

import type { ZoneClimatique } from '../constants'

export type Departement = string // ex: '29', '75', '2A'

const ZONES_PAR_DEPARTEMENT: Record<Departement, ZoneClimatique> = {
  '01': 'H1C', '02': 'H1A', '03': 'H1C', '04': 'H2D', '05': 'H1C', '06': 'H3',
  '07': 'H2D', '08': 'H1B', '09': 'H2C', '10': 'H1B', '11': 'H3', '12': 'H2C',
  '13': 'H3', '14': 'H2A', '15': 'H1C', '16': 'H2B', '17': 'H2B', '18': 'H2B',
  '19': 'H1C', '21': 'H1C', '22': 'H2A', '23': 'H1C', '24': 'H2C', '25': 'H1C',
  '26': 'H2D', '27': 'H1A', '28': 'H1A', '29': 'H2A', '2A': 'H3', '2B': 'H3',
  '30': 'H3', '31': 'H2C', '32': 'H2C', '33': 'H2C', '34': 'H3', '35': 'H2A',
  '36': 'H2B', '37': 'H2B', '38': 'H1C', '39': 'H1C', '40': 'H2C', '41': 'H2B',
  '42': 'H1C', '43': 'H1C', '44': 'H2B', '45': 'H1A', '46': 'H2C', '47': 'H2C',
  '48': 'H2D', '49': 'H2B', '50': 'H2A', '51': 'H1B', '52': 'H1B', '53': 'H2B',
  '54': 'H1B', '55': 'H1B', '56': 'H2A', '57': 'H1B', '58': 'H1B', '59': 'H1A',
  '60': 'H1A', '61': 'H2A', '62': 'H1A', '63': 'H1C', '64': 'H2C', '65': 'H2C',
  '66': 'H3', '67': 'H1B', '68': 'H1B', '69': 'H1C', '70': 'H1B', '71': 'H1C',
  '72': 'H2B', '73': 'H1C', '74': 'H1C', '75': 'H1A', '76': 'H1A', '77': 'H1A',
  '78': 'H1A', '79': 'H2B', '80': 'H1A', '81': 'H2C', '82': 'H2C', '83': 'H3',
  '84': 'H2D', '85': 'H2B', '86': 'H2B', '87': 'H1C', '88': 'H1B', '89': 'H1B',
  '90': 'H1B', '91': 'H1A', '92': 'H1A', '93': 'H1A', '94': 'H1A', '95': 'H1A',
  // DROM (zones approximées)
  '971': 'H3', '972': 'H3', '973': 'H3', '974': 'H3', '976': 'H3',
}

/**
 * Extraire le département depuis un code INSEE (5 chiffres).
 * Cas spéciaux : 2A/2B (Corse), DROM (3 chiffres).
 */
export function departementFromInsee(insee: string): Departement {
  if (insee.length !== 5) {
    throw new Error(`Code INSEE invalide (5 chiffres attendus) : ${insee}`)
  }
  // Corse : 2A001-2A366 → '2A', 2B001-2B366 → '2B'
  if (insee.startsWith('2A') || insee.startsWith('2B')) {
    return insee.substring(0, 2)
  }
  // DROM : 971xx, 972xx, 973xx, 974xx, 976xx
  if (insee.startsWith('97')) {
    return insee.substring(0, 3)
  }
  // Métropole : 2 premiers chiffres
  return insee.substring(0, 2)
}

export function getZoneClimatique(insee: string): ZoneClimatique {
  const dept = departementFromInsee(insee)
  const zone = ZONES_PAR_DEPARTEMENT[dept]
  if (!zone) {
    throw new Error(`Département inconnu : ${dept} (insee=${insee})`)
  }
  return zone
}

/**
 * Bucket altitude pour les lookups DH/Nref.
 * Source : tv.db.altitudes (3 buckets : 0, 400, 800).
 */
export function altitudeBucket(altitudeM: number): 0 | 400 | 800 {
  if (altitudeM >= 800) return 800
  if (altitudeM >= 400) return 400
  return 0
}
