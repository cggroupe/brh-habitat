/**
 * Phase 18.6 — Algorithme feed V1 déterministe.
 *
 * Inspiré AUTAF ENGINE V2 (5/8 composantes simplifiées) :
 *   - recency_decay : 1 / (age_h + 1)^1.2 × 10
 *   - network proximity : +30 si auteur dans mon réseau (connexion accepted)
 *   - geo proximity : +15 si même département
 *   - métier complementaire : +10 si tag intersecte avec mes métiers
 *   - boost annonce_chantier match : +25 si post_type='annonce_chantier'
 *     ET au moins 1 métier intersecte mes métiers
 *   - engagement : +5 par like (cap 50)
 *   - déjà vu : -50 si présent dans seen_post_ids
 *
 * Ne fait QUE du calcul de score. Le fetching des posts est dans api/reseau-posts.ts.
 */

export interface FeedScoringPost {
  id: string
  author_pro_id: string
  post_type: string
  metiers_tags: string[]
  region_codes: string[]
  like_count: number
  created_at: string // ISO
}

export interface FeedScoringContext {
  /** UUID des partner_contracts dans mon réseau (connexion accepted). */
  myNetworkProIds: Set<string>
  /** Département du viewer (ex: '29'). */
  myDepartement: string | null
  /** Métiers tag du viewer (ex: ['couverture', 'isolation']). */
  myMetiers: string[]
  /** Posts déjà vus (UUID). */
  seenPostIds: Set<string>
  /** Date de référence pour le calcul recency (par défaut now()). */
  now?: Date
}

/**
 * Calcule le score d'un post pour un viewer donné.
 * Plus le score est élevé, plus le post est pertinent.
 */
export function scoreFeedItem(post: FeedScoringPost, ctx: FeedScoringContext): number {
  const now = ctx.now ?? new Date()
  const ageHours = Math.max(
    0,
    (now.getTime() - new Date(post.created_at).getTime()) / 3_600_000,
  )

  // 1) Recency decay (max ~10 pour age=0, ~5 pour age=1h, ~0.5 pour age=24h)
  const recencyScore = (1 / Math.pow(ageHours + 1, 1.2)) * 10

  // 2) Réseau proximity
  const networkBonus = ctx.myNetworkProIds.has(post.author_pro_id) ? 30 : 0

  // 3) Geo proximity
  const geoBonus = ctx.myDepartement && post.region_codes.includes(ctx.myDepartement) ? 15 : 0

  // 4) Métier complémentaire
  const metierMatch = post.metiers_tags.some((t) => ctx.myMetiers.includes(t))
  const metierBonus = metierMatch ? 10 : 0

  // 5) Boost annonce_chantier match métier
  const chantierBoost = post.post_type === 'annonce_chantier' && metierMatch ? 25 : 0

  // 6) Engagement (like_count cap 50)
  const engagementBonus = Math.min(post.like_count * 5, 50)

  // 7) Pénalité déjà vu
  const seenPenalty = ctx.seenPostIds.has(post.id) ? -50 : 0

  return (
    recencyScore +
    networkBonus +
    geoBonus +
    metierBonus +
    chantierBoost +
    engagementBonus +
    seenPenalty
  )
}

/**
 * Tri stable par score décroissant. Tie-break par created_at DESC.
 */
export function rankFeedItems(
  posts: FeedScoringPost[],
  ctx: FeedScoringContext,
): Array<{ post: FeedScoringPost; score: number }> {
  return posts
    .map((post) => ({ post, score: scoreFeedItem(post, ctx) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime()
    })
}
