/**
 * Enedis Open Data — conso résidentielle adresse (≥10 PDL) + thermosensibilité IRIS.
 *
 * APIs Opendatasoft :
 * - `consommation-annuelle-residentielle-par-adresse` (≥10 PDL/adresse)
 * - `consommation-annuelle-par-iris` (toutes adresses agrégées)
 *
 * Note : seuil 10 PDL/adresse fait que ~90% rural BZH n'est pas couvert nominativement.
 * Fallback systématique IRIS (table `brh_ext_iris.thermosens_kwh_dj`).
 *
 * V1 : signature des fonctions + parsing — implémentation fetch dans Phase 11.1 EF
 * (le côté front n'appelle JAMAIS Enedis directement, toujours via EF).
 */

import type { EnedisAddrSignal } from './types'

const ENEDIS_API_BASE = 'https://data.enedis.fr/api/explore/v2.1/catalog/datasets'

/**
 * Réponse Opendatasoft Enedis adresse (subset utile).
 */
interface EnedisAddrApiRow {
  adresse?: string
  code_commune?: string
  conso_moyenne_mwh?: number
  nb_logements?: number
}

/**
 * Parse une réponse Opendatasoft Enedis adresse → signal score-v2.
 *
 * Calcule kWh/logt/an. Retourne `null` si pas de logements ou conso nulle.
 */
export function parseEnedisAddrSignal(row: EnedisAddrApiRow | null | undefined): EnedisAddrSignal {
  if (!row || !row.conso_moyenne_mwh || !row.nb_logements || row.nb_logements <= 0) {
    return { kwh_par_logt: null }
  }
  const kwh = (row.conso_moyenne_mwh * 1000) / row.nb_logements
  return { kwh_par_logt: Number.isFinite(kwh) ? Math.round(kwh * 10) / 10 : null }
}

/**
 * Construit l'URL de requête Enedis pour une adresse (côté EF uniquement).
 */
export function buildEnedisAddrUrl(opts: {
  codeCommune: string
  voie: string
  numero?: string
}): string {
  const where = [
    `code_commune="${opts.codeCommune}"`,
    `lower(adresse) like "%${opts.voie.toLowerCase().replace(/"/g, '')}%"`,
  ]
  if (opts.numero) where.push(`numero_voie="${opts.numero}"`)
  const params = new URLSearchParams({
    select: 'adresse,code_commune,conso_moyenne_mwh,nb_logements',
    where: where.join(' AND '),
    limit: '1',
  })
  return `${ENEDIS_API_BASE}/consommation-annuelle-residentielle-par-adresse/records?${params.toString()}`
}

/**
 * Construit l'URL de requête Enedis IRIS (thermosensibilité agrégée).
 */
export function buildEnedisIrisUrl(opts: { departement: string }): string {
  const params = new URLSearchParams({
    select: 'code_iris,thermosensibilite,conso_moyenne_mwh,nb_pdl',
    where: `substr(code_iris,1,2)="${opts.departement}"`,
    limit: '10000',
  })
  return `${ENEDIS_API_BASE}/consommation-residentielle-iris/records?${params.toString()}`
}
