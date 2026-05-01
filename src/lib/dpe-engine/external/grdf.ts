/**
 * GRDF Open Data — conso gaz résidentiel par IRIS.
 *
 * API Opendatasoft :
 * - `consommation-annuelle-de-gaz-par-iris` (logements raccordés)
 *
 * Apport scoring : cible chaudière gaz vieillissante (>15 ans → remplacement PAC ou hybride).
 *
 * V1 : signature des fonctions + parsing — implémentation fetch dans Phase 11.1 EF.
 */

const GRDF_API_BASE = 'https://opendata.grdf.fr/api/explore/v2.1/catalog/datasets'

interface GrdfIrisApiRow {
  code_iris?: string
  conso_totale_mwh?: number
  nb_pdl_residentiels?: number
}

export interface GrdfIrisSignal {
  conso_gaz_mwh_an: number | null
  pdl_gaz_resid: number | null
}

/**
 * Parse une réponse GRDF IRIS.
 */
export function parseGrdfIrisSignal(row: GrdfIrisApiRow | null | undefined): GrdfIrisSignal {
  if (!row) return { conso_gaz_mwh_an: null, pdl_gaz_resid: null }
  return {
    conso_gaz_mwh_an: row.conso_totale_mwh != null ? Math.round(row.conso_totale_mwh) : null,
    pdl_gaz_resid: row.nb_pdl_residentiels != null ? row.nb_pdl_residentiels : null,
  }
}

/**
 * URL GRDF IRIS pour un département donné.
 */
export function buildGrdfIrisUrl(opts: { departement: string }): string {
  const params = new URLSearchParams({
    select: 'code_iris,conso_totale_mwh,nb_pdl_residentiels',
    where: `substr(code_iris,1,2)="${opts.departement}"`,
    limit: '10000',
  })
  return `${GRDF_API_BASE}/consommation-annuelle-de-gaz-par-iris/records?${params.toString()}`
}

/**
 * Heuristique : détection commune "gaz dominant" (>50% logements raccordés).
 *
 * Utile pour cibler chaudière gaz vieillissante.
 */
export function isGazDominantIris(signal: GrdfIrisSignal, totalLogtsIris: number): boolean {
  if (!signal.pdl_gaz_resid || !totalLogtsIris) return false
  return signal.pdl_gaz_resid / totalLogtsIris > 0.5
}
