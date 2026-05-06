/**
 * Phase 18.6 — Tracking observabilité algo feed (5 events).
 *
 * Inspiré AUTAF ENGINE V2 (subset) : 'view', 'dwell', 'click', 'expand', 'hide'.
 * Indispensable pour la pénalité "déjà vu" du feed-algo + tuning V2.
 */
import { supabase } from '@/lib/supabase'

export type ImpressionEventType = 'view' | 'dwell' | 'click' | 'expand' | 'hide'

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

export const reseauImpressionsApi = {
  /** Track un event d'impression (fire-and-forget, n'attend pas la réponse). */
  async track(params: {
    postId: string
    eventType: ImpressionEventType
    dwellMs?: number
    sessionId?: string
  }): Promise<void> {
    const myId = await getMyProId()
    if (!myId) return
    const deviceType =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
        ? 'mobile'
        : 'desktop'
    await supabase.from('brh_feed_impressions').insert({
      post_id: params.postId,
      viewer_pro_id: myId,
      event_type: params.eventType,
      dwell_ms: params.dwellMs ?? null,
      device_type: deviceType,
      session_id: params.sessionId ?? null,
    })
  },

  /** Liste des post_ids déjà vus par l'utilisateur (pour pénalité algo). */
  async myViewedPostIds(limit = 200): Promise<string[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_feed_impressions')
      .select('post_id')
      .eq('viewer_pro_id', myId)
      .eq('event_type', 'view')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return Array.from(new Set((data ?? []).map((d) => d.post_id)))
  },
}
