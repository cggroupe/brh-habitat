import { supabase } from '@/lib/supabase'
import type { BrhRewardsCatalogRow, BrhRewardClaimRow } from '@/types/partner'

export type RewardInsert = Omit<BrhRewardsCatalogRow, 'id' | 'created_at' | 'updated_at'>
export type RewardUpdate = Partial<RewardInsert>

export async function fetchRewardsCatalog(activeOnly = true): Promise<BrhRewardsCatalogRow[]> {
  let query = supabase
    .from('brh_rewards_catalog')
    .select('*')
    .order('sort_order', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createReward(payload: RewardInsert): Promise<BrhRewardsCatalogRow> {
  const { data, error } = await supabase
    .from('brh_rewards_catalog')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateReward(id: string, payload: RewardUpdate): Promise<BrhRewardsCatalogRow> {
  const { data, error } = await supabase
    .from('brh_rewards_catalog')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchMyClaims(affiliateId: string): Promise<BrhRewardClaimRow[]> {
  const { data, error } = await supabase
    .from('brh_reward_claims')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createRewardClaim(
  affiliateId: string,
  rewardId: string,
  pointsSpent: number,
  shippingAddress?: string,
): Promise<BrhRewardClaimRow> {
  const { data, error } = await supabase
    .from('brh_reward_claims')
    .insert({
      affiliate_id: affiliateId,
      reward_id: rewardId,
      points_spent: pointsSpent,
      shipping_address: shippingAddress ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchAllClaims(): Promise<(BrhRewardClaimRow & { affiliate_name?: string })[]> {
  const { data, error } = await supabase
    .from('brh_reward_claims')
    .select('*, affiliate:brh_affiliates(id, profile:profiles(full_name))')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((c) => ({
    ...c,
    affiliate_name: (c.affiliate as unknown as { profile: { full_name: string } })?.profile?.full_name ?? '—',
  }))
}

export async function updateClaimStatus(
  id: string,
  status: string,
  adminNotes?: string,
): Promise<BrhRewardClaimRow> {
  const payload: Partial<BrhRewardClaimRow> = { status: status as BrhRewardClaimRow['status'] }
  if (adminNotes !== undefined) payload.admin_notes = adminNotes

  const { data, error } = await supabase
    .from('brh_reward_claims')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
