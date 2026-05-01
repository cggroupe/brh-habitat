/**
 * DVF — Demandes de Valeurs Foncières (DGFiP via data.gouv.fr).
 *
 * Phase 11.2 — Tier 2 contextualisation.
 *
 * Source : https://files.data.gouv.fr/geo-dvf/latest/csv/{annee}/communes/{dept}/{insee}.csv
 *   - Format CSV ouvert (Licence Ouverte 2.0)
 *   - Une ligne par mutation (achat/vente/donation)
 *   - Champs : id_mutation, date_mutation, valeur_fonciere, surface_reelle_bati,
 *     longitude, latitude, code_type_local (1=Maison, 2=Appartement, 3=Dépendance, 4=Local industriel)
 *
 * Apport scoring :
 *   - Règle #1 (mutation_24m + F/G) : signal achat → +35 pts
 *   - Règle #8 (gentrification commune) : prix m² +15% sur 3 ans → +7 pts
 */

const DVF_BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv'

export interface DvfMutation {
  date_mutation: string             // YYYY-MM-DD
  valeur_fonciere: number | null
  surface_reelle_bati: number | null
  prix_m2: number | null
  code_type_local: 1 | 2 | 3 | 4 | null
  longitude: number | null
  latitude: number | null
  nature_mutation: string | null
}

/**
 * URL CSV DVF pour une commune INSEE et une année donnée.
 */
export function buildDvfUrl(opts: { annee: number; codeInsee: string }): string {
  const dept = opts.codeInsee.startsWith('97') ? opts.codeInsee.slice(0, 3) : opts.codeInsee.slice(0, 2)
  return `${DVF_BASE}/${opts.annee}/communes/${dept}/${opts.codeInsee}.csv`
}

/**
 * Parse une ligne CSV DVF en DvfMutation.
 * Format CSV : id_mutation,date_mutation,...,valeur_fonciere,...
 *
 * Note : on splite naïvement sur ',' — les champs DVF officiels n'ont pas de
 * virgules embarquées (texte simple, pas de quotes).
 */
export function parseDvfRow(headers: string[], cols: string[]): DvfMutation | null {
  const idx = (name: string) => headers.indexOf(name)
  const iDate = idx('date_mutation')
  const iValeur = idx('valeur_fonciere')
  const iSurface = idx('surface_reelle_bati')
  const iCode = idx('code_type_local')
  const iLon = idx('longitude')
  const iLat = idx('latitude')
  const iNature = idx('nature_mutation')

  if (iDate < 0 || cols.length < headers.length / 2) return null

  const date = cols[iDate]
  if (!date) return null

  const valeur = parseFloat(cols[iValeur])
  const surface = parseFloat(cols[iSurface])
  const prix_m2 = Number.isFinite(valeur) && Number.isFinite(surface) && surface > 0
    ? Math.round(valeur / surface)
    : null

  const codeRaw = cols[iCode]
  const code = codeRaw ? Number(codeRaw) : NaN
  const code_type_local: DvfMutation['code_type_local'] =
    code === 1 || code === 2 || code === 3 || code === 4 ? code : null

  return {
    date_mutation: date,
    valeur_fonciere: Number.isFinite(valeur) ? valeur : null,
    surface_reelle_bati: Number.isFinite(surface) ? surface : null,
    prix_m2,
    code_type_local,
    longitude: parseFloat(cols[iLon]) || null,
    latitude: parseFloat(cols[iLat]) || null,
    nature_mutation: cols[iNature] || null,
  }
}

/**
 * Détecte si une mutation est dans les N derniers mois.
 */
export function isMutationRecent(date_mutation: string, monthsBack: number, ref?: Date): boolean {
  const d = new Date(date_mutation)
  if (!Number.isFinite(d.getTime())) return false
  const now = ref ?? new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - monthsBack)
  return d >= cutoff
}

/**
 * Distance Haversine entre 2 coords lat/lng (mètres).
 * Utilisée pour matcher une mutation à une parcelle prospect.
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000 // rayon Terre m
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

/**
 * Calcule la médiane d'un tableau de nombres.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Aggrège des mutations en signal commune (médiane prix m² + croissance 3y).
 *
 * `mutations3y` doivent être triées par date.
 * On filtre les types_local 1 (maison) et 2 (appartement) uniquement.
 */
export function aggregatePriceMedian3y(mutations3y: DvfMutation[]): {
  prix_m2_median_3y: number | null
  prix_m2_growth_3y: number | null
} {
  const valid = mutations3y.filter(
    (m) => m.prix_m2 !== null && (m.code_type_local === 1 || m.code_type_local === 2),
  )
  if (valid.length === 0) return { prix_m2_median_3y: null, prix_m2_growth_3y: null }

  const allPrices = valid.map((m) => m.prix_m2!)
  const prix_m2_median_3y = median(allPrices)

  // Croissance : médiane 1ère moitié vs médiane 2nde moitié (par date asc)
  const sorted = valid.slice().sort((a, b) => a.date_mutation.localeCompare(b.date_mutation))
  const half = Math.floor(sorted.length / 2)
  if (half < 2) return { prix_m2_median_3y, prix_m2_growth_3y: null }

  const olderMed = median(sorted.slice(0, half).map((m) => m.prix_m2!))
  const recentMed = median(sorted.slice(half).map((m) => m.prix_m2!))
  if (olderMed == null || recentMed == null || olderMed <= 0) {
    return { prix_m2_median_3y, prix_m2_growth_3y: null }
  }
  const growth = (recentMed - olderMed) / olderMed
  return {
    prix_m2_median_3y,
    prix_m2_growth_3y: Math.round(growth * 1000) / 1000,
  }
}

/**
 * Détecte si une parcelle (lat/lng) a eu une mutation < 24 mois dans la liste.
 *
 * Tolérance spatiale : 30m (parcelle adjacente).
 */
export function findRecentMutationAtCoords(
  mutations: DvfMutation[],
  coords: { lat: number; lng: number },
  monthsBack = 24,
  toleranceMeters = 30,
): DvfMutation | null {
  const now = new Date()
  for (const m of mutations) {
    if (!isMutationRecent(m.date_mutation, monthsBack, now)) continue
    if (m.latitude == null || m.longitude == null) continue
    if (m.code_type_local !== 1 && m.code_type_local !== 2) continue
    const dist = haversineMeters(coords, { lat: m.latitude, lng: m.longitude })
    if (dist <= toleranceMeters) return m
  }
  return null
}
