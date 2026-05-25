import { supabase } from '@/lib/supabase'
import { formatLocalDate } from '@/lib/utils'
import type { BrhSocialPostRow, SocialPostStatus } from '@/types/partner'
import type { Database } from '@/types/database-generated'
import { PAGE_SIZE } from '@/data/constants'
import { socialPostInsertSchema, brhSocialPostRowSchema, type SocialPostInsert } from './schemas'

type BrhSocialPostsUpdate = Database['public']['Tables']['brh_social_posts']['Update']

export type { SocialPostInsert } from './schemas'

export interface PaginatedSocialPosts {
  data: BrhSocialPostRow[]
  count: number
  page: number
}

export async function fetchMySocialPosts(userId: string): Promise<BrhSocialPostRow[]> {
  const { data, error } = await supabase
    .from('brh_social_posts')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return brhSocialPostRowSchema.array().parse(data ?? []) as BrhSocialPostRow[]
}

export async function fetchAllSocialPosts(page: number, status?: SocialPostStatus): Promise<PaginatedSocialPosts> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_social_posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: brhSocialPostRowSchema.array().parse(data ?? []) as BrhSocialPostRow[], count: count ?? 0, page }
}

export async function createSocialPost(payload: SocialPostInsert): Promise<BrhSocialPostRow> {
  const validated = socialPostInsertSchema.parse(payload)

  const { data, error } = await supabase
    .from('brh_social_posts')
    .insert(validated)
    .select()
    .single()

  if (error) throw error
  return brhSocialPostRowSchema.parse(data) as BrhSocialPostRow
}

export async function updateSocialPostStatus(
  id: string,
  status: SocialPostStatus,
  rejectionReason?: string | null,
  adminNotes?: string | null,
): Promise<BrhSocialPostRow> {
  const payload: BrhSocialPostsUpdate = { status }
  if (status === 'validee') {
    payload.validated_at = new Date().toISOString()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    payload.expiry_check_date = formatLocalDate(expiry)
  }
  if (rejectionReason !== undefined) payload.rejection_reason = rejectionReason
  if (adminNotes !== undefined) payload.admin_notes = adminNotes

  const { data, error } = await supabase
    .from('brh_social_posts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return brhSocialPostRowSchema.parse(data) as BrhSocialPostRow
}

export async function getMonthlyPostCount(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const y = startOfMonth.getFullYear()
  const m = String(startOfMonth.getMonth() + 1).padStart(2, '0')
  const startStr = `${y}-${m}-01`

  const { count, error } = await supabase
    .from('brh_social_posts')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId)
    .neq('status', 'refusee')
    .gte('created_at', startStr)

  if (error) throw error
  return count ?? 0
}
