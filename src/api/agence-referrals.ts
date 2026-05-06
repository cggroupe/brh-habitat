/**
 * Phase 16.1 — API parrainage agences (commissions 100 € HT par charte signée).
 */
import { supabase } from '@/lib/supabase'

export interface ReferralCommission {
  id: string
  recruiter_agence_id: string
  recruited_agence_id: string
  partner_contract_id: string | null
  commission_amount_cents: number
  /** Phase 16.1 Step C — niveau 1-5 dans la cascade. */
  chain_level: number
  /** Phase 16.1 Step C — leads bonus crédités (variable par niveau). */
  leads_bonus_amount: number
  status: 'pending' | 'validated' | 'paid' | 'cancelled'
  paid_at: string | null
  notes: string | null
  created_at: string
  recruited?: {
    id: string
    raison_sociale: string | null
    commune: string | null
    code_postal: string | null
    departement: string | null
    status: string
  } | null
}

export interface ReferralTreeNode {
  agence_id: string
  raison_sociale: string | null
  commune: string | null
  departement: string | null
  status: string
  chain_level: number
  parent_agence_id: string | null
  cash_earned_cents: number
  leads_earned: number
  created_at: string
}

export interface ReferredAgence {
  id: string
  raison_sociale: string | null
  commune: string | null
  code_postal: string | null
  departement: string | null
  status: string
  created_at: string
}

export const agenceReferralsApi = {
  async listMyCommissions(recruiterAgenceId: string): Promise<ReferralCommission[]> {
    const { data, error } = await supabase
      .from('brh_agence_referral_commissions')
      .select(
        '*, recruited:brh_agences_immo!brh_agence_referral_commissions_recruited_agence_id_fkey(id, raison_sociale, commune, code_postal, departement, status)',
      )
      .eq('recruiter_agence_id', recruiterAgenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as ReferralCommission[]
  },

  async listMyReferred(recruiterAgenceId: string): Promise<ReferredAgence[]> {
    const { data, error } = await supabase
      .from('brh_agences_immo')
      .select('id, raison_sociale, commune, code_postal, departement, status, created_at')
      .eq('referred_by_agence_id', recruiterAgenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ReferredAgence[]
  },

  /** Phase 16.1 Step C — arbre 5 niveaux des filleuls de l'agence du caller. */
  async getMyReferralTree(): Promise<ReferralTreeNode[]> {
    const { data, error } = await supabase.rpc('brh_get_my_referral_tree')
    if (error) throw error
    return (data ?? []) as ReferralTreeNode[]
  },
}
