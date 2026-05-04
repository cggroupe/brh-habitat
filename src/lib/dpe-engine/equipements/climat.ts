/**
 * Climat — DH (degrés-heures) + Nref + ECh (ensoleillement chauffage).
 *
 * Source : CapRénov+ `fra/CalcClimat.as:146-300` + `DataClimatReglementaire.json`.
 * Wiki : caprenov-reverse/wiki/03-moteur-equipements/climat-dh-nref.md
 *
 * Structure JSON (chaque fichier suit le même pattern) :
 *   { _meta: ..., <key>: { inertie LEGERE/LOURDE: { conv/dep: { 0/400/800: { '1'-'12': [8 zones] } } } } }
 * Ordre des zones : ['H1A','H1B','H1C','H2A','H2B','H2C','H2D','H3']
 */

import type { Comportement, Inertie, ZoneClimatique } from '../constants'
import { altitudeBucket } from '../geo/zones-climatiques'
import dhChJson from '../data/DataClimatReglementaire_DHCh.json'
import nrefChJson from '../data/DataClimatReglementaire_NrefCh.json'
import eChJson from '../data/DataClimatReglementaire_ECh.json'
import dhRaJson from '../data/DataClimatReglementaire_DHRa.json'
import nrefRaJson from '../data/DataClimatReglementaire_NrefRa.json'
import eRaJson from '../data/DataClimatReglementaire_ERa.json'

const ZONE_INDEX: Record<ZoneClimatique, number> = {
  H1A: 0, H1B: 1, H1C: 2, H2A: 3, H2B: 4, H2C: 5, H2D: 6, H3: 7,
}

type ClimatTree = {
  [inertie: string]: {
    [comportement: string]: {
      [altitude: string]: {
        [mois: string]: number[]
      }
    }
  }
}

// Extract data tree from JSON (skip _meta)
const dhCh = (dhChJson as Record<string, unknown>).DHCh as ClimatTree
const nrefCh = (nrefChJson as Record<string, unknown>).NrefCh as ClimatTree
const eCh = (eChJson as Record<string, unknown>).ECh as ClimatTree
const dhRa = (dhRaJson as Record<string, unknown>).DHRa as ClimatTree
const nrefRa = (nrefRaJson as Record<string, unknown>).NrefRa as ClimatTree
const eRa = (eRaJson as Record<string, unknown>).ERa as ClimatTree

function normalizeComportement(c?: Comportement): 'conventionnel' | 'depensier' {
  return c === 'depensier' ? 'depensier' : 'conventionnel'
}

function normalizeInertie(i: string): 'LEGERE' | 'LOURDE' {
  const u = i.toUpperCase()
  if (u === 'LOURDE' || u === 'TRES_LOURDE') return 'LOURDE'
  return 'LEGERE'
}

export interface ClimatLookupOpts {
  inertie: Inertie | string
  comportement?: Comportement
  altitude: number
  zone: ZoneClimatique
  mois: number | string
}

function climatLookup(tree: ClimatTree, opts: ClimatLookupOpts): number {
  const inertie = normalizeInertie(opts.inertie)
  const comp = normalizeComportement(opts.comportement)
  const alt = String(altitudeBucket(opts.altitude))
  const m = String(opts.mois)
  const arr = tree[inertie]?.[comp]?.[alt]?.[m]
  const idx = ZONE_INDEX[opts.zone]
  if (!arr || idx === undefined) return 0
  return arr[idx] ?? 0
}

/** DHCh_j (degrés-heures de chauffage du mois j). */
export const getDHCh = (o: ClimatLookupOpts) => climatLookup(dhCh, o)

/** NrefCh_j (heures conventionnelles de chauffage du mois j). */
export const getNrefCh = (o: ClimatLookupOpts) => climatLookup(nrefCh, o)

/** ECh_j (ensoleillement saison de chauffage, kWh/m²). */
export const getECh = (o: ClimatLookupOpts) => climatLookup(eCh, o)

/** DHRa_j (degrés-heures de refroidissement été). */
export const getDHRa = (o: ClimatLookupOpts) => climatLookup(dhRa, o)

export const getNrefRa = (o: ClimatLookupOpts) => climatLookup(nrefRa, o)
export const getERa = (o: ClimatLookupOpts) => climatLookup(eRa, o)

function sumAnnual(getFn: (o: ClimatLookupOpts) => number, o: Omit<ClimatLookupOpts, 'mois'>): number {
  let total = 0
  for (let m = 1; m <= 12; m++) total += getFn({ ...o, mois: m })
  return total
}

export const getDHChAnnuel = (o: Omit<ClimatLookupOpts, 'mois'>) => sumAnnual(getDHCh, o)
export const getNrefChAnnuel = (o: Omit<ClimatLookupOpts, 'mois'>) => sumAnnual(getNrefCh, o)
export const getEChAnnuel = (o: Omit<ClimatLookupOpts, 'mois'>) => sumAnnual(getECh, o)

/**
 * Tbase — température extérieure de dimensionnement (°C).
 * Source : CapRénov+ `fra/CalcSpecifique.as:544-597`.
 */
const TBASE: Record<string, [number, number, number]> = {
  H1A: [-9.5, -11.5, -13.5], H1B: [-9.5, -11.5, -13.5], H1C: [-9.5, -11.5, -13.5],
  H2A: [-6.5, -8.5, -10.5], H2B: [-6.5, -8.5, -10.5], H2C: [-6.5, -8.5, -10.5], H2D: [-6.5, -8.5, -10.5],
  H3: [-3.5, -5.5, -7.5],
}

export function getTbase(zone: ZoneClimatique, altitudeM: number): number {
  const altIdx = altitudeM < 400 ? 0 : altitudeM < 800 ? 1 : 2
  return TBASE[zone][altIdx]
}
