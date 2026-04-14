import { supabase } from '@/lib/supabase'
import type { BrhAffiliateRow, BrhPointsTransactionRow, BrhProspectRow } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'
import { affiliateWithProfileSchema, brhProspectRowSchema } from './schemas'

export interface AffiliateWithProfile extends BrhAffiliateRow {
  profile: { full_name: string; email: string; avatar_url: string | null }
}

export interface PaginatedAffiliates {
  data: AffiliateWithProfile[]
  count: number
  page: number
}

export async function createAffiliate(userId: string, referralCode: string): Promise<void> {
  const { error } = await supabase
    .from('brh_affiliates')
    .insert({ id: userId, referral_code: referralCode })

  if (error) throw error
}

export async function updateAffiliateRecruiter(userId: string, recruitedBy: string): Promise<void> {
  const { error } = await supabase
    .from('brh_affiliates')
    .update({ recruited_by: recruitedBy })
    .eq('id', userId)

  if (error) throw error
}

export async function fetchMyAffiliate(userId: string): Promise<BrhAffiliateRow | null> {
  const { data, error } = await supabase
    .from('brh_affiliates')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchAllAffiliates(page: number): Promise<PaginatedAffiliates> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('brh_affiliates')
    .select('*, profile:profiles(full_name, email, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: affiliateWithProfileSchema.array().parse(data ?? []) as AffiliateWithProfile[], count: count ?? 0, page }
}

export async function fetchAffiliateProspects(affiliateId: string): Promise<BrhProspectRow[]> {
  const { data, error } = await supabase
    .from('brh_prospects')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return brhProspectRowSchema.array().parse(data ?? []) as BrhProspectRow[]
}

export async function fetchPointsHistory(affiliateId: string): Promise<BrhPointsTransactionRow[]> {
  const { data, error } = await supabase
    .from('brh_points_transactions')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
