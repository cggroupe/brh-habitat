import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export interface CompanyInvitationRow {
  id: string
  company_id: string
  invited_by: string
  email: string
  member_role: 'owner' | 'member'
  token: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
}

export async function fetchMyInvitations(): Promise<CompanyInvitationRow[]> {
  const { data, error } = await supabase
    .from('brh_company_invitations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CompanyInvitationRow[]
}

export async function createInvitation(email: string, memberRole: 'member' | 'owner' = 'member'): Promise<{ ok: boolean; email_sent: boolean; link?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Session Supabase introuvable. Reconnectez-vous.')

  const resp = await fetch(edgeFunctionUrl('company-invite'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, member_role: memberRole }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`)
  return data
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('brh_company_invitations')
    .delete()
    .eq('id', invitationId)
    .is('accepted_at', null)
  if (error) throw error
}
