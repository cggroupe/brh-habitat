/**
 * Phase 13.6 — Matching artisans RGE pour un prospect/geste donné.
 *
 * Algorithme V1 :
 *   1. Filtre `geste_specialites @> [geste]` + marketplace_active
 *   2. Distance Haversine prospect ↔ artisan (km)
 *   3. Score combiné = score_qualite × proximité_factor × premium_boost
 *   4. Tri DESC, top N
 *
 * proximité_factor :
 *   ≤ 10 km   → 1.0
 *   10-25 km  → 0.85
 *   25-50 km  → 0.7
 *   50-100 km → 0.5
 *   > 100 km  → 0.3 (rural breton, on ne va pas plus loin)
 *
 * premium_boost : 1.15 si marketplace_premium = true (artisan abonné Phase 13.6.1)
 */

export type GesteId =
  | 'pac_air_eau'
  | 'pac_eau_eau'
  | 'pac_air_air'
  | 'isolation_combles_perdus'
  | 'isolation_combles_amenages'
  | 'isolation_murs_ite'
  | 'isolation_murs_iti'
  | 'isolation_plancher_bas'
  | 'fenetres_double_vitrage'
  | 'fenetres_triple_vitrage'
  | 'porte_isolante'
  | 'vmc_double_flux'
  | 'vmc_simple_flux'
  | 'chauffage_bois_buche'
  | 'chauffage_bois_granules'
  | 'chauffage_solaire'
  | 'chauffe_eau_solaire'
  | 'chauffe_eau_thermodynamique'

export interface ArtisanCandidate {
  id: string
  nom_entreprise: string
  representant: string | null
  email: string | null
  telephone: string | null
  site_web?: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  latitude: number | null
  longitude: number | null
  geste_specialites: string[]
  score_qualite: number | null
  nombre_chantiers_brh: number
  nombre_chantiers_lifetime?: number
  taux_conversion_brh: number | null
  marketplace_premium: boolean
}

export interface ArtisanMatch {
  artisan: ArtisanCandidate
  distance_km: number
  proximity_factor: number
  combined_score: number
}

/**
 * Distance Haversine en km entre 2 coords lat/lng.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371 // rayon Terre km
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
 * Coefficient de proximité décroissant par paliers.
 */
export function proximityFactor(distanceKm: number): number {
  if (distanceKm <= 10) return 1.0
  if (distanceKm <= 25) return 0.85
  if (distanceKm <= 50) return 0.7
  if (distanceKm <= 100) return 0.5
  return 0.3
}

/**
 * Match les artisans RGE pour un prospect + geste donné.
 *
 * Retourne triés par combined_score DESC. Limite par défaut top 10.
 */
export function matchArtisansForGeste(
  prospect: { lat: number; lng: number },
  geste: GesteId,
  candidates: ArtisanCandidate[],
  limit = 10,
): ArtisanMatch[] {
  const matches: ArtisanMatch[] = []

  for (const artisan of candidates) {
    // Filtre spécialité (le tableau peut contenir GesteId ou tout autre string)
    if (!artisan.geste_specialites.includes(geste)) continue
    if (artisan.latitude == null || artisan.longitude == null) continue

    const distance_km = haversineKm(prospect, { lat: artisan.latitude, lng: artisan.longitude })
    const proximity = proximityFactor(distance_km)
    const baseScore = artisan.score_qualite ?? 50 // default si pas encore noté
    const premiumBoost = artisan.marketplace_premium ? 1.15 : 1.0
    const combined_score = Math.round(baseScore * proximity * premiumBoost * 100) / 100

    matches.push({
      artisan,
      distance_km: Math.round(distance_km * 10) / 10,
      proximity_factor: proximity,
      combined_score,
    })
  }

  matches.sort((a, b) => b.combined_score - a.combined_score)
  return matches.slice(0, limit)
}

/**
 * Inverse : pour un artisan donné, retourne les prospects matching ses spécialités
 * dans un rayon X km. Utilisé par la vue artisan (Phase 13.6.1+).
 */
export function findProspectsForArtisan(
  artisan: { lat: number; lng: number; geste_specialites: string[] },
  prospects: Array<{ id: number; lat: number; lng: number; gestes_recommandes: string[] }>,
  maxDistanceKm = 50,
): Array<{ prospectId: number; distance_km: number; matched_gestes: string[] }> {
  const out: Array<{ prospectId: number; distance_km: number; matched_gestes: string[] }> = []

  for (const p of prospects) {
    const matched_gestes = p.gestes_recommandes.filter((g) => artisan.geste_specialites.includes(g))
    if (matched_gestes.length === 0) continue

    const distance_km = haversineKm(artisan, { lat: p.lat, lng: p.lng })
    if (distance_km > maxDistanceKm) continue

    out.push({ prospectId: p.id, distance_km: Math.round(distance_km * 10) / 10, matched_gestes })
  }

  out.sort((a, b) => a.distance_km - b.distance_km)
  return out
}
