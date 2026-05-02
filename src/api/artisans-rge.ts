/**
 * API artisans-rge — Phase 13.6.
 *
 * Pair volontaire avec hooks/queries/artisans-rge.ts.
 */

import { supabase } from '@/lib/supabase'
import { matchArtisansForGeste, type GesteId, type ArtisanCandidate, type ArtisanMatch } from '@/lib/dpe-engine/marketplace'

export interface ArtisanRow extends ArtisanCandidate {
  siret: string
  adresse: string | null
  code_insee: string
  site_web: string | null
  rge_certifications: unknown
  nombre_chantiers_lifetime: number
  marketplace_active: boolean
  source: string | null
  last_verified_at: string | null
  created_at: string
}

export interface ArtisanLeadRow {
  id: string
  artisan_id: string
  prospect_id: number
  recommended_by: string | null
  geste: string
  estimated_chantier_ttc_eur: number | null
  expected_commission_eur: number | null
  status: 'pending' | 'accepted' | 'declined' | 'quoted' | 'signed' | 'completed' | 'canceled'
  status_reason: string | null
  responded_at: string | null
  signed_at: string | null
  completed_at: string | null
  actual_chantier_ttc_eur: number | null
  commission_paid_eur: number | null
  commission_paid_at: string | null
  created_at: string
  updated_at: string
}

export const artisansRgeApi = {
  /**
   * Liste les artisans actifs filtrables par geste, dépt, code_postal.
   */
  async list(filters: {
    geste?: GesteId | null
    departement?: '22' | '29' | '35' | '56' | null
    codePostal?: string | null
    limit?: number
  } = {}): Promise<ArtisanRow[]> {
    let q = supabase
      .from('brh_artisans_rge')
      .select('*')
      .eq('marketplace_active', true)

    if (filters.geste) q = q.contains('geste_specialites', [filters.geste])
    if (filters.departement) q = q.eq('departement', filters.departement)
    if (filters.codePostal) q = q.eq('code_postal', filters.codePostal)

    q = q.order('marketplace_premium', { ascending: false }).order('score_qualite', { ascending: false, nullsFirst: false })
    q = q.limit(filters.limit ?? 50)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as unknown as ArtisanRow[]
  },

  /**
   * Match les meilleurs artisans pour un prospect + geste.
   * Charge les artisans, applique le matching côté front (perf : <1k artisans BZH).
   */
  async matchForProspect(opts: {
    prospectLat: number
    prospectLng: number
    geste: GesteId
    departement?: '22' | '29' | '35' | '56' | null
    limit?: number
  }): Promise<ArtisanMatch[]> {
    const candidates = await artisansRgeApi.list({
      geste: opts.geste,
      departement: opts.departement,
      limit: 500,
    })
    return matchArtisansForGeste(
      { lat: opts.prospectLat, lng: opts.prospectLng },
      opts.geste,
      candidates,
      opts.limit ?? 10,
    )
  },

  /**
   * Récupère 1 artisan par ID.
   */
  async get(id: string): Promise<ArtisanRow | null> {
    const { data, error } = await supabase
      .from('brh_artisans_rge')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return (data as unknown as ArtisanRow) ?? null
  },

  /**
   * Crée une recommandation lead artisan (pro RGE → artisan).
   */
  async createLead(input: {
    artisan_id: string
    prospect_id: number
    geste: GesteId
    estimated_chantier_ttc_eur?: number
  }): Promise<ArtisanLeadRow> {
    const expected_commission_eur = input.estimated_chantier_ttc_eur
      ? Math.round(input.estimated_chantier_ttc_eur * 0.05) // 5% par défaut
      : null

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) throw new Error('Auth requise')

    const { data, error } = await supabase
      .from('brh_artisan_leads')
      .insert({
        artisan_id: input.artisan_id,
        prospect_id: input.prospect_id,
        geste: input.geste,
        estimated_chantier_ttc_eur: input.estimated_chantier_ttc_eur ?? null,
        expected_commission_eur,
        recommended_by: userData.user.id,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as unknown as ArtisanLeadRow
  },

  /**
   * Phase 13.6.3 — Notifie l'artisan par email (Resend) avec le contexte prospect complet.
   * À appeler après createLead pour finaliser la boucle.
   */
  async notifyArtisanByEmail(leadId: string): Promise<{ sent: boolean; resendId?: string; to?: string }> {
    const { data, error } = await supabase.functions.invoke<{
      sent: boolean
      resendId?: string
      to?: string
    }>('notify-artisan-lead', { body: { leadId } })
    if (error) throw error
    return data ?? { sent: false }
  },

  /**
   * Liste les leads recommandés par le pro courant.
   */
  async myLeads(): Promise<ArtisanLeadRow[]> {
    const { data, error } = await supabase
      .from('brh_artisan_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []) as unknown as ArtisanLeadRow[]
  },
}
