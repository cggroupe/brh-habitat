/**
 * Phase 18.7 — Matching d'offres de chantiers pour un pro.
 *
 * Algorithme V1 simple :
 *   1. Filtre par intersection métiers (mes métiers ∩ offer.metiers_recherches)
 *   2. Distance Haversine pro ↔ offer (km)
 *   3. Score = match_metier_count × proximité_factor × recency_factor
 *   4. Tri DESC, top N
 *
 * Réutilise la philosophie de Phase 13.6 (matching artisans pour prospects)
 * mais inversée : ici on cherche les chantiers pour le pro courant.
 */

export interface ChantierMatchInput {
  id: string
  metiers_recherches: string[]
  lat: number | null
  lng: number | null
  departement: string | null
  status: string
  created_at: string
  budget_cents: number | null
}

export interface MatchProContext {
  myLat: number | null
  myLng: number | null
  myDepartement: string | null
  myMetiers: string[]
  /** Date de référence pour la recency (par défaut now()). */
  now?: Date
}

export interface ScoredChantier {
  chantier: ChantierMatchInput
  distanceKm: number | null
  matchedMetiers: string[]
  score: number
}

/**
 * Distance en kilomètres entre 2 points GPS (Haversine).
 * Identique à la fonction de Phase 13.6 — copie locale pour éviter dépendance cross-domaine.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371 // rayon Terre km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return R * c
}

/**
 * Facteur de proximité décroissant avec la distance.
 * 1.0 ≤ 10 km, 0.85 ≤ 25 km, 0.7 ≤ 50 km, 0.5 ≤ 100 km, 0.3 sinon.
 * Fallback 0.6 si pas de coordonnées (même département) ou 0.2 (autre dépt).
 */
export function proximityFactor(distanceKm: number | null, sameDepartement: boolean): number {
  if (distanceKm === null) {
    return sameDepartement ? 0.6 : 0.2
  }
  if (distanceKm <= 10) return 1.0
  if (distanceKm <= 25) return 0.85
  if (distanceKm <= 50) return 0.7
  if (distanceKm <= 100) return 0.5
  return 0.3
}

/**
 * Facteur de fraîcheur : décroit linéairement de 1.0 (offre du jour) à 0.3 (≥ 30 jours).
 */
export function recencyFactor(createdAt: string, now: Date = new Date()): number {
  const ageDays = (now.getTime() - new Date(createdAt).getTime()) / 86_400_000
  if (ageDays <= 0) return 1.0
  if (ageDays >= 30) return 0.3
  return 1.0 - (ageDays / 30) * 0.7
}

/**
 * Compte les métiers en intersection entre mes métiers et ceux recherchés par l'offre.
 */
export function matchMetiers(myMetiers: string[], offerMetiers: string[]): string[] {
  const my = new Set(myMetiers)
  return offerMetiers.filter((m) => my.has(m))
}

/**
 * Score un chantier pour le pro courant. Renvoie null si le pro ne matche aucun métier.
 */
export function scoreChantierForPro(
  chantier: ChantierMatchInput,
  ctx: MatchProContext,
): ScoredChantier | null {
  const matched = matchMetiers(ctx.myMetiers, chantier.metiers_recherches)
  // Pas de match métier → on filtre OUT (sauf si le pro n'a pas renseigné ses métiers,
  // auquel cas on garde tout sans bonus métier)
  if (ctx.myMetiers.length > 0 && matched.length === 0) return null

  const distanceKm =
    ctx.myLat !== null && ctx.myLng !== null && chantier.lat !== null && chantier.lng !== null
      ? haversineKm({ lat: ctx.myLat, lng: ctx.myLng }, { lat: chantier.lat, lng: chantier.lng })
      : null

  const sameDept =
    ctx.myDepartement !== null && chantier.departement === ctx.myDepartement

  const prox = proximityFactor(distanceKm, sameDept)
  const recency = recencyFactor(chantier.created_at, ctx.now)
  const matchBonus = Math.max(1, matched.length) // au moins 1 pour ne pas écraser

  const score = matchBonus * prox * recency * 100

  return {
    chantier,
    distanceKm,
    matchedMetiers: matched,
    score,
  }
}

/**
 * Filtre + score + trie une liste d'offres pour le pro courant.
 * Filtre status = 'open' uniquement.
 */
export function rankChantiersForPro(
  chantiers: ChantierMatchInput[],
  ctx: MatchProContext,
): ScoredChantier[] {
  const open = chantiers.filter((c) => c.status === 'open')
  return open
    .map((c) => scoreChantierForPro(c, ctx))
    .filter((s): s is ScoredChantier => s !== null)
    .sort((a, b) => b.score - a.score)
}
