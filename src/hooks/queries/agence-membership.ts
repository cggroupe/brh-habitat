/**
 * Phase 16.0.6 — Hook React Query pour la membership agence immo.
 *
 * Phase 16.1 (Step 3) — étendu : un user est "membre d'une agence" si :
 *   1. Il est signer d'une charte active (cas historique), OU
 *   2. Il est listé dans brh_agence_members rattaché à une agence dont la
 *      charte partenaire est active (cas employé invité).
 *
 * Le rôle ('signer'|'employee') est exposé pour permettre à l'UI de masquer
 * les actions admin agence (inviter / retirer membres / éditer charte) aux
 * employés.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface AgenceMembership {
  contractId: string
  agenceId: string
  signerName: string
  role: 'signer' | 'employee'
}

export const AGENCE_MEMBERSHIP_KEY = ['my-agence-membership'] as const

export function useMyAgenceMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...AGENCE_MEMBERSHIP_KEY, user?.id ?? 'anon'] as const,
    queryFn: async (): Promise<AgenceMembership | null> => {
      if (!user?.id) return null

      // 1. Cas signer : charte partenaire active à son nom
      const { data: contract, error: cErr } = await supabase
        .from('brh_partner_contracts')
        .select('id, agence_id, signer_full_name, status, partner_type')
        .eq('signer_profile_id', user.id)
        .eq('partner_type', 'agence_immo')
        .eq('status', 'active')
        .maybeSingle()
      if (cErr) throw cErr
      if (contract && contract.agence_id) {
        return {
          contractId: contract.id,
          agenceId: contract.agence_id,
          signerName: contract.signer_full_name,
          role: 'signer',
        }
      }

      // 2. Cas employé : ligne dans brh_agence_members + charte agence active
      const { data: member, error: mErr } = await supabase
        .from('brh_agence_members')
        .select('agence_id, member_role')
        .eq('profile_id', user.id)
        .eq('member_role', 'employee')
        .maybeSingle()
      if (mErr) throw mErr
      if (!member?.agence_id) return null

      // Vérifie que la charte de l'agence est bien active (sinon employé orphelin)
      const { data: agenceContract, error: acErr } = await supabase
        .from('brh_partner_contracts')
        .select('id, signer_full_name')
        .eq('agence_id', member.agence_id)
        .eq('partner_type', 'agence_immo')
        .eq('status', 'active')
        .maybeSingle()
      if (acErr) throw acErr
      if (!agenceContract) return null

      return {
        contractId: agenceContract.id,
        agenceId: member.agence_id,
        signerName: agenceContract.signer_full_name,
        role: 'employee',
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })
}
