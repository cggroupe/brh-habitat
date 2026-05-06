/**
 * Phase 18.5 — API endorsements réseau social `/reseau`.
 *
 * Pair volontaire avec hooks/queries/reseau-endorsements.ts.
 *
 * Décision #3 (06/05) : endorsements only V1 (pas de notes 1-5).
 *
 * RLS (cf. migration 20260706300000) :
 *   - SELECT : tout pro authentifié (is_hidden=false) + endorser voit les siens
 *   - INSERT : endorser = mon partner_contract_id
 *   - DELETE : endorser uniquement
 */
import { supabase } from '@/lib/supabase'

export interface ProEndorsement {
  id: string
  tenant_id: string
  endorser_pro_id: string
  endorsed_pro_id: string
  metier_tag: string
  body: string | null
  chantier_offer_id: string | null
  is_hidden: boolean
  created_at: string
}

async function getMyProId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return null
  const { data, error } = await supabase
    .from('brh_partner_contracts')
    .select('id')
    .eq('signer_profile_id', user.id)
    .eq('status', 'active')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export const reseauEndorsementsApi = {
  /** Endorsements reçus par un pro donné (visibles publiquement). */
  async forPro(proId: string): Promise<ProEndorsement[]> {
    const { data, error } = await supabase
      .from('brh_pro_endorsements')
      .select('*')
      .eq('endorsed_pro_id', proId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as ProEndorsement[]
  },

  /** Endorsements que j'ai donnés. */
  async mine(): Promise<ProEndorsement[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_pro_endorsements')
      .select('*')
      .eq('endorser_pro_id', myId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ProEndorsement[]
  },

  /** Donner un endorsement (positif uniquement V1). */
  async create(params: {
    endorsedProId: string
    metierTag: string
    body?: string
    chantierOfferId?: string
  }): Promise<ProEndorsement> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')
    if (myId === params.endorsedProId) throw new Error('Auto-endorsement interdit')

    const { data, error } = await supabase
      .from('brh_pro_endorsements')
      .insert({
        endorser_pro_id: myId,
        endorsed_pro_id: params.endorsedProId,
        metier_tag: params.metierTag,
        body: params.body ?? null,
        chantier_offer_id: params.chantierOfferId ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data as ProEndorsement
  },

  /** Retirer un de mes endorsements. */
  async remove(endorsementId: string): Promise<void> {
    const { error } = await supabase
      .from('brh_pro_endorsements')
      .delete()
      .eq('id', endorsementId)
    if (error) throw error
  },
}
