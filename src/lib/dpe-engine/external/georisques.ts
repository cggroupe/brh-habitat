/**
 * API Géorisques — risques par adresse / commune (BRGM/MTE).
 *
 * Endpoints utilisés :
 * - `/api/v1/rga` (retrait-gonflement argile)
 * - `/api/v1/radon` (catégorie commune)
 * - `/api/v1/inondation` (PPRi présence)
 * - `/api/v1/cavites` (proximité cavités souterraines)
 *
 * Apport scoring :
 * - RGA fort : +10 pts (entrée ITE/fissures)
 * - Radon zone 3 : +10 pts (upsell VMC double-flux)
 * - PPRi : flag ABF possible
 *
 * V1 : signature des fonctions + parsing. Fetch côté EF uniquement (cache 90j).
 */

import type { RgaAlea, RisquesAdresse } from './types'

const GEORISQUES_API_BASE = 'https://georisques.gouv.fr/api/v1'

interface RgaApiResponse {
  data?: Array<{
    code_insee?: string
    alea?: 'faible' | 'moyen' | 'fort'
  }>
}

interface RadonApiResponse {
  data?: Array<{
    code_insee?: string
    classe_potentiel?: 1 | 2 | 3
  }>
}

interface InondationApiResponse {
  data?: Array<{
    code_insee?: string
    libelle_risque?: string
    type_pprn?: string
  }>
}

interface CavitesApiResponse {
  data?: Array<{ code_insee?: string }>
}

/**
 * URLs Géorisques par code INSEE.
 */
export function buildGeorisquesUrls(codeInsee: string): {
  rga: string
  radon: string
  inondation: string
  cavites: string
} {
  return {
    rga: `${GEORISQUES_API_BASE}/rga?code_insee=${codeInsee}`,
    radon: `${GEORISQUES_API_BASE}/radon?code_insee=${codeInsee}`,
    inondation: `${GEORISQUES_API_BASE}/risques?code_insee=${codeInsee}&rayon=200`,
    cavites: `${GEORISQUES_API_BASE}/cavites?code_insee=${codeInsee}`,
  }
}

/**
 * Agrège les 4 endpoints Géorisques en un signal de risques par adresse.
 *
 * Note : V1 garde la granularité "commune" pour RGA. La granularité parcelle
 * sera ajoutée Phase 11.4 (LiDAR + BD TOPO).
 */
export function aggregateGeorisques(payload: {
  rga: RgaApiResponse | null
  radon: RadonApiResponse | null
  inondation: InondationApiResponse | null
  cavites: CavitesApiResponse | null
  codeInsee: string
}): RisquesAdresse {
  const rga_local: RgaAlea | null = payload.rga?.data?.[0]?.alea ?? null

  const inondationFirst = payload.inondation?.data?.[0]
  const inondation_zone = inondationFirst?.type_pprn ?? inondationFirst?.libelle_risque ?? null

  const cavites_proches = payload.cavites?.data?.length ?? 0

  // ABF : à enrichir Phase 11.2 via API Carto IGN (GPU)
  return {
    rga_local,
    inondation_zone,
    cavites_proches,
    abf_zone: false,
    abf_type: null,
  }
}

/**
 * Extrait la catégorie radon (1/2/3) depuis la réponse API.
 */
export function extractRadonCategorie(
  payload: RadonApiResponse | null,
): 1 | 2 | 3 | null {
  return payload?.data?.[0]?.classe_potentiel ?? null
}
