import { supabase } from '@/lib/supabase'
import type { BrhCompanyMemberRow } from '@/types/partner'
import type { ProfileRow } from '@/types/database'

export interface CompanyMemberWithProfile extends BrhCompanyMemberRow {
  profile: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'avatar_url'>
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('brh_company_members')
    .select('*, profile:profiles(id, email, full_name, avatar_url)')
    .eq('company_id', companyId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as CompanyMemberWithProfile[]
}

export async function inviteMember(companyId: string, email: string): Promise<void> {
  // Trouver le profil par email via RPC SECURITY DEFINER (contourne RLS profiles)
  const { data: results, error: rpcError } = await supabase
    .rpc('find_profile_by_email', { search_email: email })

  const profile = Array.isArray(results) ? results[0] : results

  if (rpcError || !profile) {
    throw new Error('Aucun compte trouve avec cet email. L\'utilisateur doit d\'abord creer un compte.')
  }

  if (profile.role !== 'pro') {
    throw new Error('Cet utilisateur n\'a pas un compte professionnel.')
  }

  const { error } = await supabase
    .from('brh_company_members')
    .insert({ company_id: companyId, profile_id: profile.id, member_role: 'member' })

  if (error) {
    if (error.code === '23505') throw new Error('Ce membre fait deja partie de l\'equipe.')
    throw error
  }
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('brh_company_members')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}
