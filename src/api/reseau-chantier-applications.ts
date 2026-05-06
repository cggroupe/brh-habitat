/**
 * Phase 18.7 — API candidatures sur offres de chantier.
 *
 * Workflow :
 *   1. Pro candidat : insert brh_chantier_applications (status='pending')
 *   2. Publisher : list candidatures de son offre, shortlist/select
 *   3. À la sélection (status='selected') → trigger DB snapshot commission_pct
 *   4. Quand quote_id signé → trigger calcule commission_amount_cents
 */
import { supabase } from '@/lib/supabase'

export type ApplicationStatus = 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'withdrawn'
export type CommissionStatus = 'pending' | 'validated' | 'paid'

export interface ChantierApplication {
  id: string
  offer_id: string
  applicant_pro_id: string
  message: string | null
  devis_url: string | null
  devis_amount_cents: number | null
  status: ApplicationStatus
  commission_pct_snapshot: number | null
  commission_amount_cents: number | null
  commission_status: CommissionStatus | null
  commission_paid_at: string | null
  message_thread_id: string | null
  quote_id: string | null
  selected_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
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

export const reseauChantierApplicationsApi = {
  /** Candidatures sur une offre (publisher voit toutes, applicant voit la sienne). */
  async listForOffer(offerId: string): Promise<ChantierApplication[]> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ChantierApplication[]
  },

  /** Mes candidatures envoyées. */
  async mine(): Promise<ChantierApplication[]> {
    const myId = await getMyProId()
    if (!myId) return []
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .select('*')
      .eq('applicant_pro_id', myId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ChantierApplication[]
  },

  /** Candidater à une offre. */
  async apply(params: {
    offerId: string
    message?: string
    devisAmountCents?: number
    devisUrl?: string
  }): Promise<ChantierApplication> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .insert({
        offer_id: params.offerId,
        applicant_pro_id: myId,
        message: params.message ?? null,
        devis_amount_cents: params.devisAmountCents ?? null,
        devis_url: params.devisUrl ?? null,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },

  /** Publisher : passer en shortlisted. */
  async shortlist(applicationId: string): Promise<ChantierApplication> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .update({ status: 'shortlisted' })
      .eq('id', applicationId)
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },

  /** Publisher : sélectionner une candidature → trigger DB snapshot commission_pct. */
  async select(applicationId: string): Promise<ChantierApplication> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .update({ status: 'selected' })
      .eq('id', applicationId)
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },

  /** Publisher : rejeter une candidature. */
  async reject(applicationId: string): Promise<ChantierApplication> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },

  /** Applicant : retirer sa candidature. */
  async withdraw(applicationId: string): Promise<ChantierApplication> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },

  /**
   * Lier un quote_id signé à la candidature → trigger DB calcule commission_amount_cents.
   * Réservé admin BRH (saisie devis signé).
   */
  async linkSignedQuote(applicationId: string, quoteId: string): Promise<ChantierApplication> {
    const { data, error } = await supabase
      .from('brh_chantier_applications')
      .update({ quote_id: quoteId })
      .eq('id', applicationId)
      .select()
      .single()
    if (error) throw error
    return data as ChantierApplication
  },
}
