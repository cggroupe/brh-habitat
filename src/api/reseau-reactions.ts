/**
 * Phase 18.6 — API réactions sur posts du fil.
 *
 * 3 reaction_type V1 : 'like', 'recommande', 'expert'.
 * V1 UI = like seulement, recommande/expert exposés mais non câblés (V2).
 */
import { supabase } from '@/lib/supabase'

export type ReactionType = 'like' | 'recommande' | 'expert'

export interface FeedReaction {
  post_id: string
  pro_id: string
  reaction_type: ReactionType
  created_at: string
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

export const reseauReactionsApi = {
  /** Mes réactions sur une liste de posts (pour highlight UI). */
  async myReactionsForPosts(postIds: string[]): Promise<FeedReaction[]> {
    if (postIds.length === 0) return []
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_feed_reactions')
      .select('*')
      .eq('pro_id', myId)
      .in('post_id', postIds)
    if (error) throw error
    return (data ?? []) as FeedReaction[]
  },

  /** Toggle d'une réaction : insert si absent, delete si présent. */
  async toggle(postId: string, reactionType: ReactionType = 'like'): Promise<'added' | 'removed'> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')

    // Check si déjà présent
    const { data: existing } = await supabase
      .from('brh_feed_reactions')
      .select('post_id')
      .eq('post_id', postId)
      .eq('pro_id', myId)
      .eq('reaction_type', reactionType)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('brh_feed_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('pro_id', myId)
        .eq('reaction_type', reactionType)
      if (error) throw error
      return 'removed'
    } else {
      const { error } = await supabase.from('brh_feed_reactions').insert({
        post_id: postId,
        pro_id: myId,
        reaction_type: reactionType,
      })
      if (error) throw error
      return 'added'
    }
  },
}
