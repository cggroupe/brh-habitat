/**
 * Phase 18.6 — API signalements (modération minimale embarquée).
 *
 * Étape 6 = signalement par les pros (pending → admin valide en Étape 9).
 * Workflow simple : insert → admin review → action_taken (warn/hide/ban).
 */
import { supabase } from '@/lib/supabase'

export type ReportReason = 'spam' | 'illegal' | 'offensive' | 'rgpd_personne' | 'rgpd_plaque' | 'other'

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

export const reseauReportsApi = {
  async reportPost(params: {
    postId: string
    reason: ReportReason
    comment?: string
  }): Promise<void> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')
    const { error } = await supabase.from('brh_feed_reports').insert({
      reporter_pro_id: myId,
      reported_post_id: params.postId,
      reason: params.reason,
      comment: params.comment ?? null,
    })
    if (error) throw error
  },

  async reportComment(params: {
    commentId: string
    reason: ReportReason
    comment?: string
  }): Promise<void> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')
    const { error } = await supabase.from('brh_feed_reports').insert({
      reporter_pro_id: myId,
      reported_comment_id: params.commentId,
      reason: params.reason,
      comment: params.comment ?? null,
    })
    if (error) throw error
  },
}
