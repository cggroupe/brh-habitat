import { supabase } from '@/lib/supabase'
import type { BrhCompanyMemberRow } from '@/types/partner'
import type { ProfileRow } from '@/types/database'
import { companyMemberWithProfileSchema } from './schemas'

export interface CompanyMemberWithProfile extends BrhCompanyMemberRow {
  profile: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'avatar_url'>
}

export async function addCompanyMember(
  companyId: string,
  profileId: string,
  memberRole: BrhCompanyMemberRow['member_role'] = 'owner'
): Promise<void> {
  const { error } = await supabase
    .from('brh_company_members')
    .insert({ company_id: companyId, profile_id: profileId, member_role: memberRole })

  if (error) throw error
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('brh_company_members')
    .select('*, profile:profiles(id, email, full_name, avatar_url)')
    .eq('company_id', companyId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return companyMemberWithProfileSchema.array().parse(data ?? []) as CompanyMemberWithProfile[]
}

export async function inviteMember(_companyId: string, email: string): Promise<void> {
  // Delegation a l'Edge Function company-invite qui :
  // 1. Verifie que le user connecte est owner de sa company
  // 2. Genere un token + INSERT brh_company_invitations
  // 3. Envoie un email via Resend avec lien /inscription/pro/rejoindre?token=xxx
  // (companyId deduit cote backend depuis la session, on ignore le param)
  const { createInvitation } = await import('./invitations')
  const result = await createInvitation(email, 'member')
  if (!result.ok) throw new Error('Erreur lors de l\'envoi de l\'invitation.')
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('brh_company_members')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}
