/**
 * Phase 16.1 — API équipe agence (members + permissions JSONB).
 *
 * Pattern miroir de src/api/company-members.ts (Pro). Toutes les écritures
 * passent par RPC SECURITY DEFINER côté SQL — voir migration
 * `20260706160000_brh_agence_members.sql`.
 */
import { supabase } from '@/lib/supabase'
import type { AgenceMemberPermissions } from '@/types/agence-permissions'

export interface AgenceMemberRow {
  id: string
  agence_id: string
  profile_id: string
  member_role: 'signer' | 'employee'
  permissions: AgenceMemberPermissions
  invited_by_profile_id: string | null
  invited_at: string
  joined_at: string
  profile?: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export const agenceMembersApi = {
  /** Liste les membres (signer + employees) d'une agence. RLS filtre. */
  async list(agenceId: string): Promise<AgenceMemberRow[]> {
    const { data, error } = await supabase
      .from('brh_agence_members')
      .select(
        '*, profile:profiles(id, email, full_name, avatar_url)',
      )
      .eq('agence_id', agenceId)
      .order('member_role', { ascending: true }) // signer en premier
      .order('joined_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as AgenceMemberRow[]
  },

  /**
   * Invite un employé existant (par email d'un profil BRH).
   * Le caller doit être signer actif d'une agence.
   * @returns id du member créé/mis à jour.
   */
  async inviteEmployee(
    email: string,
    permissions: AgenceMemberPermissions,
  ): Promise<string> {
    const { data, error } = await supabase.rpc('brh_agence_invite_employee', {
      p_email: email.trim(),
      p_permissions: permissions,
    })
    if (error) throw mapInviteError(error)
    return data as string
  },

  /** Met à jour les permissions d'un employé. Signer-only. */
  async setPermissions(
    memberId: string,
    permissions: AgenceMemberPermissions,
  ): Promise<void> {
    const { error } = await supabase.rpc('brh_agence_set_member_permissions', {
      p_member_id: memberId,
      p_permissions: permissions,
    })
    if (error) throw error
  },

  /** Retire un employé. Signer-only. */
  async remove(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('brh_agence_remove_member', {
      p_member_id: memberId,
    })
    if (error) throw error
  },
}

function mapInviteError(err: { message?: string; code?: string }): Error {
  const msg = err.message ?? ''
  if (msg.includes('profile_not_found')) {
    return new Error(
      'Aucun compte BRH trouvé pour cette adresse email. L\'utilisateur doit s\'inscrire d\'abord.',
    )
  }
  if (msg.includes('cannot_invite_self')) {
    return new Error('Vous ne pouvez pas vous inviter vous-même.')
  }
  if (msg.includes('caller_not_active_agence_signer')) {
    return new Error('Seul le signataire de la charte peut inviter des employés.')
  }
  if (msg.includes('only_signer_can')) {
    return new Error('Seul le signataire de la charte peut effectuer cette action.')
  }
  return new Error(msg || 'Erreur lors de l\'invitation.')
}
