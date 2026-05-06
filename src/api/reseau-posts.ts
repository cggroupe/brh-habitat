/**
 * Phase 18.6 — API posts du fil `/reseau`.
 *
 * RLS (cf. migration 20260706300000) :
 *   - SELECT : `brh_pro_can_view_post()` (visibilité graph-aware)
 *   - INSERT : author_pro_id = mon partner_contract_id
 *   - UPDATE/DELETE : auteur uniquement
 *
 * Storage bucket `reseau-media` (privé) — voir migration 20260706310000.
 */
import { supabase } from '@/lib/supabase'
import type { BlurZone } from '@/lib/reseau/blur-canvas'

export type FeedPostType =
  | 'photo_chantier'
  | 'realisation'
  | 'recommandation'
  | 'question_metier'
  | 'recherche_partenaire'
  | 'annonce_chantier'
  | 'actu'
  | 'autre'

export type FeedVisibility = 'public' | 'reseau' | 'prive'

export interface FeedPost {
  id: string
  tenant_id: string
  author_pro_id: string
  author_profile_id: string | null
  post_type: FeedPostType
  body: string | null
  media_urls: string[]
  media_blur_zones: BlurZone[][] | null
  metiers_tags: string[]
  region_codes: string[]
  related_chantier_offer_id: string | null
  visibility: FeedVisibility
  is_pinned: boolean
  is_hidden: boolean
  hidden_at: string | null
  hidden_reason: string | null
  like_count: number
  comment_count: number
  impression_count: number
  created_at: string
  updated_at: string
}

async function getMyProId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return null
  const { data, error } = await supabase
    .from('brh_partner_contracts')
    .select('id')
    .eq('signer_profile_id', user.id)
    .eq('status', 'active')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export interface ListFeedFilters {
  /** Filtre par auteur (profil pro spécifique). */
  authorProId?: string
  /** Filtre par type de post. */
  postType?: FeedPostType
  /** Limite (défaut 50, max 100). */
  limit?: number
  /** Curseur created_at pour pagination. */
  before?: string
}

export const reseauPostsApi = {
  /** Liste les posts visibles par le viewer (RLS applique brh_pro_can_view_post). */
  async list(filters: ListFeedFilters = {}): Promise<FeedPost[]> {
    const limit = Math.min(filters.limit ?? 50, 100)
    let q = supabase
      .from('brh_feed_posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (filters.authorProId) q = q.eq('author_pro_id', filters.authorProId)
    if (filters.postType) q = q.eq('post_type', filters.postType)
    if (filters.before) q = q.lt('created_at', filters.before)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as FeedPost[]
  },

  /** Détail d'un post. */
  async getById(id: string): Promise<FeedPost | null> {
    const { data, error } = await supabase
      .from('brh_feed_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as FeedPost | null
  },

  /** Créer un post (sans média initialement, médias uploadés après). */
  async create(payload: {
    post_type: FeedPostType
    body?: string
    metiers_tags?: string[]
    region_codes?: string[]
    visibility?: FeedVisibility
    related_chantier_offer_id?: string
  }): Promise<FeedPost> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('brh_feed_posts')
      .insert({
        author_pro_id: myId,
        author_profile_id: user?.id ?? null,
        post_type: payload.post_type,
        body: payload.body ?? null,
        metiers_tags: payload.metiers_tags ?? [],
        region_codes: payload.region_codes ?? [],
        visibility: payload.visibility ?? 'public',
        related_chantier_offer_id: payload.related_chantier_offer_id ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data as FeedPost
  },

  /** Update auteur uniquement (body / metiers / visibility). */
  async update(
    id: string,
    patch: Partial<{
      body: string | null
      metiers_tags: string[]
      region_codes: string[]
      visibility: FeedVisibility
    }>,
  ): Promise<FeedPost> {
    const { data, error } = await supabase
      .from('brh_feed_posts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FeedPost
  },

  /** Soft-delete : auteur ou admin (admin via is_hidden=true). */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('brh_feed_posts').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Upload une photo + sa version floutée. Retourne les chemins Storage.
   * Le post doit déjà exister (postId requis).
   *
   * Convention nommage : {postId}/{idx}_original.jpg + {postId}/{idx}_public.jpg
   */
  async uploadMedia(params: {
    postId: string
    index: number
    originalBlob: Blob
    publicBlob: Blob
    blurZones: BlurZone[]
  }): Promise<{ originalPath: string; publicPath: string }> {
    const originalPath = `${params.postId}/${params.index}_original.jpg`
    const publicPath = `${params.postId}/${params.index}_public.jpg`

    const { error: e1 } = await supabase.storage
      .from('reseau-media')
      .upload(originalPath, params.originalBlob, { contentType: 'image/jpeg', upsert: true })
    if (e1) throw e1

    const { error: e2 } = await supabase.storage
      .from('reseau-media')
      .upload(publicPath, params.publicBlob, { contentType: 'image/jpeg', upsert: true })
    if (e2) throw e2

    return { originalPath, publicPath }
  },

  /**
   * Met à jour la liste des médias publics + zones blur d'un post après upload.
   */
  async setMedia(
    postId: string,
    publicPaths: string[],
    blurZones: BlurZone[][],
  ): Promise<FeedPost> {
    const { data, error } = await supabase
      .from('brh_feed_posts')
      .update({
        media_urls: publicPaths,
        media_blur_zones: blurZones as unknown as Record<string, unknown>[],
      })
      .eq('id', postId)
      .select()
      .single()
    if (error) throw error
    return data as FeedPost
  },

  /** Génère un signed URL pour un media public (TTL 1h). */
  async getSignedMediaUrl(path: string, ttlSeconds = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('reseau-media')
      .createSignedUrl(path, ttlSeconds)
    if (error) return null
    return data?.signedUrl ?? null
  },

  /**
   * Rate-limit V1 côté front : combien de posts ai-je créés dans les dernières 24h.
   * Permet à l'UI de bloquer l'affichage du composer si limite atteinte.
   */
  async myPostsCount24h(): Promise<number> {
    const myId = await getMyProId()
    if (!myId) return 0
    const since = new Date(Date.now() - 86_400_000).toISOString()
    const { count, error } = await supabase
      .from('brh_feed_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_pro_id', myId)
      .gte('created_at', since)
    if (error) throw error
    return count ?? 0
  },
}
