import { supabase } from '@/lib/supabase'

export interface RecruitedPartner {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  depth: number
  direct_recruiter_id: string | null
  prospects_count: number
  signed_count: number
}

export interface NetworkStats {
  total_recruits: number
  total_levels: number
  total_prospects: number
  total_signed: number
  total_commission_earned: number
}

export interface RecruitmentCommission {
  id: string
  recruited_id: string
  recruited_name?: string
  source_type: string
  source_amount: number
  commission_rate_percent: number
  commission_amount: number
  chain_level: number
  status: string
  created_at: string
}

export async function fetchMyRecruitTree(recruiterId: string): Promise<RecruitedPartner[]> {
  const { data, error } = await supabase.rpc('get_full_recruit_tree', { p_recruiter_id: recruiterId })
  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.profile_id as string,
    full_name: (row.full_name as string) ?? '—',
    email: row.email as string,
    role: row.role as string,
    created_at: row.created_at as string,
    depth: Number(row.depth ?? 1),
    direct_recruiter_id: (row.direct_recruiter_id as string) ?? null,
    prospects_count: Number(row.prospects_count ?? 0),
    signed_count: Number(row.signed_count ?? 0),
  }))
}

export async function fetchNetworkStats(recruiterId: string): Promise<NetworkStats> {
  const { data, error } = await supabase.rpc('get_network_stats', { p_recruiter_id: recruiterId })
  if (error) throw error

  // Le type généré ne contient que 4 colonnes mais la fonction SQL renvoie
  // aussi total_levels + total_commission_earned : on relâche le type localement.
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined
  return {
    total_recruits: Number(row?.total_recruits ?? 0),
    total_levels: Number(row?.total_levels ?? 0),
    total_prospects: Number(row?.total_prospects ?? 0),
    total_signed: Number(row?.total_signed ?? 0),
    total_commission_earned: Number(row?.total_commission_earned ?? row?.total_commission ?? 0),
  }
}

export async function fetchMyRecruitmentCommissions(recruiterId: string): Promise<RecruitmentCommission[]> {
  const { data, error } = await supabase
    .from('brh_recruitment_commissions')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const recruits = data ?? []
  const recruitedIds = [...new Set(recruits.map((r) => r.recruited_id).filter((id): id is string => Boolean(id)))]

  let nameMap: Record<string, string> = {}
  if (recruitedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', recruitedIds)
    nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? '—']))
  }

  return recruits.map((r) => ({
    ...r,
    recruited_name: r.recruited_id ? nameMap[r.recruited_id] ?? '—' : '—',
    chain_level: r.chain_level ?? 1,
  })) as RecruitmentCommission[]
}
