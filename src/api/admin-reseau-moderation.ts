/**
 * Phase 18.9 — API admin modération réseau social.
 *
 * Mode dev V1 : modération technique uniquement (signalements + hide post).
 * DPIA RGPD complet (purge + portabilité) reporté V2 après audit légal.
 *
 * RLS (cf. migration 20260706300000) :
 *   - admin (profile.role='admin') : ALL sur brh_feed_reports + brh_feed_posts + brh_feed_comments
 */
import { supabase } from '@/lib/supabase'
import type { ReportReason } from '@/api/reseau-reports'
import type { FeedPost } from '@/api/reseau-posts'

export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed'
export type ModerationAction = 'post_hidden' | 'comment_hidden' | 'user_warned' | 'user_banned' | 'no_action'

export interface FeedReport {
  id: string
  tenant_id: string
  reporter_pro_id: string
  reported_post_id: string | null
  reported_comment_id: string | null
  reason: ReportReason
  comment: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  action_taken: string | null
  created_at: string
}

/** Joint enrichi pour la page admin : report + post (si post_id) + comment body. */
export interface FeedReportWithContext extends FeedReport {
  post?: Pick<FeedPost, 'id' | 'body' | 'post_type' | 'media_urls' | 'is_hidden' | 'author_pro_id'> | null
  comment_body?: string | null
}

export const adminReseauModerationApi = {
  /** Liste les reports filtrés par status (défaut pending). */
  async listReports(status: ReportStatus | 'all' = 'pending'): Promise<FeedReportWithContext[]> {
    let q = supabase
      .from('brh_feed_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (status !== 'all') q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    const reports = (data ?? []) as FeedReport[]
    if (reports.length === 0) return []

    // Enrichir avec post + comment context
    const postIds = Array.from(new Set(reports.map((r) => r.reported_post_id).filter(Boolean) as string[]))
    const commentIds = Array.from(new Set(reports.map((r) => r.reported_comment_id).filter(Boolean) as string[]))

    const [postsRes, commentsRes] = await Promise.all([
      postIds.length
        ? supabase
            .from('brh_feed_posts')
            .select('id, body, post_type, media_urls, is_hidden, author_pro_id')
            .in('id', postIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? supabase.from('brh_feed_comments').select('id, body').in('id', commentIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const postById = new Map<string, FeedReportWithContext['post']>()
    for (const p of (postsRes.data ?? []) as NonNullable<FeedReportWithContext['post']>[]) {
      postById.set(p.id, p)
    }
    const commentById = new Map<string, string>()
    for (const c of (commentsRes.data ?? []) as { id: string; body: string }[]) {
      commentById.set(c.id, c.body)
    }

    return reports.map((r) => ({
      ...r,
      post: r.reported_post_id ? postById.get(r.reported_post_id) ?? null : null,
      comment_body: r.reported_comment_id ? commentById.get(r.reported_comment_id) ?? null : null,
    }))
  },

  /** Compte des reports pending (badge sidebar admin). */
  async countPending(): Promise<number> {
    const { count, error } = await supabase
      .from('brh_feed_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (error) throw error
    return count ?? 0
  },

  /** Marquer un report comme dismissed (rien à faire). */
  async dismissReport(reportId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('brh_feed_reports')
      .update({
        status: 'dismissed',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        action_taken: 'no_action',
      })
      .eq('id', reportId)
    if (error) throw error
  },

  /** Marquer un report comme action_taken avec une action spécifique. */
  async resolveReport(reportId: string, action: ModerationAction): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('brh_feed_reports')
      .update({
        status: 'action_taken',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        action_taken: action,
      })
      .eq('id', reportId)
    if (error) throw error
  },

  /** Hide un post (soft-delete admin) + résout le report. */
  async hidePostAndResolve(params: {
    reportId: string
    postId: string
    reason: string
  }): Promise<void> {
    const { error: e1 } = await supabase
      .from('brh_feed_posts')
      .update({
        is_hidden: true,
        hidden_at: new Date().toISOString(),
        hidden_reason: params.reason,
      })
      .eq('id', params.postId)
    if (e1) throw e1

    await adminReseauModerationApi.resolveReport(params.reportId, 'post_hidden')
  },

  /** Réafficher un post hidden (réversible). */
  async unhidePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('brh_feed_posts')
      .update({
        is_hidden: false,
        hidden_at: null,
        hidden_reason: null,
      })
      .eq('id', postId)
    if (error) throw error
  },

  /** Hide un comment + résout le report. */
  async hideCommentAndResolve(params: {
    reportId: string
    commentId: string
    reason: string
  }): Promise<void> {
    const { error: e1 } = await supabase
      .from('brh_feed_comments')
      .update({
        is_hidden: true,
        hidden_at: new Date().toISOString(),
        hidden_reason: params.reason,
      })
      .eq('id', params.commentId)
    if (e1) throw e1

    await adminReseauModerationApi.resolveReport(params.reportId, 'comment_hidden')
  },
}
