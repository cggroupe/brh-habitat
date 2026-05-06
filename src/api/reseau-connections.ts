/**
 * Phase 18.5 — API graphe social pro `/reseau/connexions`.
 *
 * Pair volontaire avec hooks/queries/reseau-connections.ts.
 *
 * RLS (cf. migration 20260706300000) :
 *   - SELECT : les 2 parties (requester OR recipient)
 *   - INSERT : requester = mon partner_contract_id (helper SQL `brh_user_pro_id()`)
 *   - UPDATE : recipient = moi (pour accepter/décliner/bloquer)
 */
import { supabase } from '@/lib/supabase'

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

export interface ProConnection {
  id: string
  tenant_id: string
  requester_pro_id: string
  recipient_pro_id: string
  status: ConnectionStatus
  message: string | null
  created_at: string
  accepted_at: string | null
  declined_at: string | null
  updated_at: string
}

export interface SuggestedPro {
  partner_contract_id: string
  partner_type: string
  signer_full_name: string
  city: string | null
  postal_code: string | null
  departement: string | null
}

/**
 * Récupère mon `partner_contract_id` actif (signataire). NULL si pas pro.
 * Utilisé par tous les helpers ci-dessous pour scoper aux pros du user courant.
 */
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

export const reseauConnectionsApi = {
  /** Connexions acceptées (les 2 sens, dédoublonnées). */
  async listAccepted(): Promise<ProConnection[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_pro_id.eq.${myId},recipient_pro_id.eq.${myId}`)
      .order('accepted_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ProConnection[]
  },

  /** Demandes reçues en attente (recipient = moi). */
  async listIncoming(): Promise<ProConnection[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .select('*')
      .eq('status', 'pending')
      .eq('recipient_pro_id', myId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ProConnection[]
  },

  /** Demandes que j'ai envoyées (requester = moi). */
  async listOutgoing(): Promise<ProConnection[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .select('*')
      .eq('status', 'pending')
      .eq('requester_pro_id', myId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ProConnection[]
  },

  /** Envoyer une demande de connexion. */
  async send(recipientProId: string, message?: string): Promise<ProConnection> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')
    if (myId === recipientProId) throw new Error('Auto-connexion interdite')
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .insert({
        requester_pro_id: myId,
        recipient_pro_id: recipientProId,
        message: message ?? null,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data as ProConnection
  },

  /** Accepter une demande reçue. */
  async accept(connectionId: string): Promise<ProConnection> {
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', connectionId)
      .select()
      .single()
    if (error) throw error
    return data as ProConnection
  },

  /** Décliner une demande reçue. */
  async decline(connectionId: string): Promise<ProConnection> {
    const { data, error } = await supabase
      .from('brh_pro_connections')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', connectionId)
      .select()
      .single()
    if (error) throw error
    return data as ProConnection
  },

  /**
   * Suggestions de connexions V1 — pros du même département non encore connectés.
   * Algorithme déterministe simple (Étape 5). V2 = scoring composite.
   * Limit 20 max.
   */
  async suggestions(limit = 10): Promise<SuggestedPro[]> {
    const myId = await getMyProId()
    if (!myId) return []

    // 1) Récupérer mon département via brh_partner_contracts → table partenaire
    const { data: myContract } = await supabase
      .from('brh_partner_contracts')
      .select('id, partner_type, agence_id, artisan_id, company_id')
      .eq('id', myId)
      .maybeSingle()
    if (!myContract) return []

    // Helper : récup département + commune depuis la table partenaire associée
    let myDept: string | null = null
    if (myContract.agence_id) {
      const { data } = await supabase
        .from('brh_agences_immo')
        .select('departement')
        .eq('id', myContract.agence_id)
        .maybeSingle()
      myDept = (data as { departement: string | null } | null)?.departement ?? null
    } else if (myContract.artisan_id) {
      const { data } = await supabase
        .from('brh_artisans_rge')
        .select('departement')
        .eq('id', myContract.artisan_id)
        .maybeSingle()
      myDept = (data as { departement: string | null } | null)?.departement ?? null
    }

    // 2) Liste des partner_contracts actifs MÊME département (autres que moi)
    let q = supabase
      .from('brh_partner_contracts')
      .select('id, partner_type, signer_full_name, agence_id, artisan_id, company_id')
      .eq('status', 'active')
      .neq('id', myId)
      .limit(Math.min(limit * 3, 60))
    if (myDept) q = q.or(`agence_id.not.is.null,artisan_id.not.is.null`)

    const { data: candidates, error } = await q
    if (error) throw error
    if (!candidates) return []

    // 3) Filtrer : pas déjà connecté (accepted ou pending)
    const { data: existing } = await supabase
      .from('brh_pro_connections')
      .select('requester_pro_id, recipient_pro_id, status')
      .or(`requester_pro_id.eq.${myId},recipient_pro_id.eq.${myId}`)
      .in('status', ['pending', 'accepted', 'blocked'])

    const excludedIds = new Set<string>()
    for (const c of existing ?? []) {
      excludedIds.add(c.requester_pro_id === myId ? c.recipient_pro_id : c.requester_pro_id)
    }

    const filtered = (candidates as Array<{
      id: string
      partner_type: string
      signer_full_name: string
      agence_id: string | null
      artisan_id: string | null
      company_id: string | null
    }>).filter((c) => !excludedIds.has(c.id)).slice(0, limit)

    // 4) Enrichir avec ville/dept via batch lookup
    const result: SuggestedPro[] = []
    for (const c of filtered) {
      let city: string | null = null
      let postal: string | null = null
      let dept: string | null = null
      if (c.agence_id) {
        const { data } = await supabase
          .from('brh_agences_immo')
          .select('commune, code_postal, departement')
          .eq('id', c.agence_id)
          .maybeSingle()
        const d = data as { commune: string | null; code_postal: string | null; departement: string | null } | null
        city = d?.commune ?? null
        postal = d?.code_postal ?? null
        dept = d?.departement ?? null
      } else if (c.artisan_id) {
        const { data } = await supabase
          .from('brh_artisans_rge')
          .select('commune, code_postal, departement')
          .eq('id', c.artisan_id)
          .maybeSingle()
        const d = data as { commune: string | null; code_postal: string | null; departement: string | null } | null
        city = d?.commune ?? null
        postal = d?.code_postal ?? null
        dept = d?.departement ?? null
      }
      result.push({
        partner_contract_id: c.id,
        partner_type: c.partner_type,
        signer_full_name: c.signer_full_name,
        city,
        postal_code: postal,
        departement: dept,
      })
    }

    // Si on a un département, prioriser les matchs même dépt en tête
    if (myDept) {
      result.sort((a, b) => {
        const aMatch = a.departement === myDept ? 0 : 1
        const bMatch = b.departement === myDept ? 0 : 1
        return aMatch - bMatch
      })
    }

    return result
  },
}
