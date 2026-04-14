import { supabase } from '@/lib/supabase'
import { formatLocalDate } from '@/lib/utils'
import type { BrhSocialPostRow } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'
import { socialPostInsertSchema, type SocialPostInsert } from './schemas'

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
  return (data ?? []) as unknown as BrhSocialPostRow[]
}

export async function fetchAllSocialPosts(page: number, status?: string): Promise<PaginatedSocialPosts> {
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
  return { data: (data ?? []) as unknown as BrhSocialPostRow[], count: count ?? 0, page }
}

export async function createSocialPost(payload: SocialPostInsert): Promise<BrhSocialPostRow> {
  const validated = socialPostInsertSchema.parse(payload)

  const { data, error } = await supabase
    .from('brh_social_posts')
    .insert(validated)
    .select()
    .single()

  if (error) throw error
  return data as unknown as BrhSocialPostRow
}

export async function updateSocialPostStatus(
  id: string,
  status: string,
  rejectionReason?: string | null,
  adminNotes?: string | null,
): Promise<BrhSocialPostRow> {
  const payload: Record<string, unknown> = { status }
  if (status === 'validee') {
    payload.validated_at = new Date().toISOString()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    payload.expiry_check_date = formatLocalDate(expiry)
  }
  if (rejectionReason) payload.rejection_reason = rejectionReason
  if (adminNotes) payload.admin_notes = adminNotes

  const { data, error } = await supabase
    .from('brh_social_posts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as BrhSocialPostRow
}

export async function getMonthlyPostCount(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('brh_social_posts')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId)
    .neq('status', 'refusee')
    .gte('created_at', startOfMonth.toISOString())

  if (error) throw error
  return count ?? 0
}
