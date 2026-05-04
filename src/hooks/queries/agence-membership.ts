/**
 * Phase 16.0.6 — Hook React Query pour la membership agence immo.
 *
 * Logique : un user est "membre d'une agence" si un brh_partner_contracts
 * existe avec son profile_id, partner_type='agence_immo' et status='active'.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface AgenceMembership {
  contractId: string
  agenceId: string
  signerName: string
}

export const AGENCE_MEMBERSHIP_KEY = ['my-agence-membership'] as const

export function useMyAgenceMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...AGENCE_MEMBERSHIP_KEY, user?.id ?? 'anon'] as const,
    queryFn: async (): Promise<AgenceMembership | null> => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('brh_partner_contracts')
        .select('id, agence_id, signer_full_name, status, partner_type')
        .eq('signer_profile_id', user.id)
        .eq('partner_type', 'agence_immo')
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      if (!data || !data.agence_id) return null
      return {
        contractId: data.id,
        agenceId: data.agence_id,
        signerName: data.signer_full_name,
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })
}
