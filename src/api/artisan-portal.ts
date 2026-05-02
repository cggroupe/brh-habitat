/**
 * API artisan-portal — Phase 13.6.4.
 *
 * Vue inverse : l'artisan voit ses leads + accept/decline.
 * Authentifié via `profile_id` lié à `brh_artisans_rge`.
 */

import { supabase } from '@/lib/supabase'
import type { ArtisanLeadRow, ArtisanRow } from '@/api/artisans-rge'

export type LeadAction = 'accept' | 'decline' | 'quote' | 'sign' | 'complete' | 'cancel'

export interface ArtisanLeadEnriched extends ArtisanLeadRow {
  prospect_commune?: string | null
  prospect_etiquette?: string | null
  prospect_surface?: number | null
  prospect_adresse?: string | null
  pro_full_name?: string | null
}

export const artisanPortalApi = {
  /**
   * Récupère la fiche artisan du user connecté (via profile_id).
   * Retourne null si l'user n'a pas d'artisan lié.
   */
  async getMyArtisan(): Promise<ArtisanRow | null> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return null

    const { data, error } = await supabase
      .from('brh_artisans_rge')
      .select('*')
      .eq('profile_id', userData.user.id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as ArtisanRow) ?? null
  },

  /**
   * Liste les leads reçus par l'artisan (RLS filtre automatiquement).
   * Joint prospect (adresse, étiquette, surface) + pro recommandeur.
   */
  async myLeadsReceived(): Promise<ArtisanLeadEnriched[]> {
    // Étape 1 : charger les leads (RLS filtre par profile_id → artisan_id)
    const { data: leads, error: lErr } = await supabase
      .from('brh_artisan_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (lErr) throw lErr
    if (!leads || leads.length === 0) return []

    // Étape 2 : joindre les prospects (id BIGINT)
    const prospectIds = Array.from(new Set(leads.map((l) => l.prospect_id as number)))
    const { data: prospects, error: pErr } = await supabase
      .from('brh_dpe_prospects')
      .select('id,commune,etiquette_dpe,surface_habitable,adresse_ban,code_postal')
      .in('id', prospectIds)
    if (pErr) throw pErr
    const pMap = new Map((prospects ?? []).map((p) => [p.id as number, p]))

    // Étape 3 : joindre les pros recommandeurs
    const proIds = Array.from(
      new Set(leads.map((l) => l.recommended_by as string | null).filter((x): x is string => !!x)),
    )
    const proMap = new Map<string, string>()
    if (proIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('id', proIds)
      for (const p of profiles ?? []) {
        proMap.set(p.id as string, (p.full_name as string | null) ?? 'Auditeur RGE BRH')
      }
    }

    return leads.map((l) => {
      const p = pMap.get(l.prospect_id as number)
      return {
        ...(l as unknown as ArtisanLeadRow),
        prospect_commune: (p?.commune as string | null) ?? null,
        prospect_etiquette: (p?.etiquette_dpe as string | null) ?? null,
        prospect_surface: (p?.surface_habitable as number | null) ?? null,
        prospect_adresse: (p?.adresse_ban as string | null) ?? null,
        pro_full_name: l.recommended_by ? proMap.get(l.recommended_by as string) ?? null : null,
      }
    })
  },

  /**
   * L'artisan répond à un lead (accept / decline / quote / sign / complete / cancel).
   * Wrapper RPC `brh_artisan_respond_lead` avec auth check + score recalc côté DB.
   */
  async respondToLead(input: {
    leadId: string
    action: LeadAction
    reason?: string
    actualChantierEur?: number
  }): Promise<{ success: boolean; new_status: string | null; message: string }> {
    const { data, error } = await supabase.rpc('brh_artisan_respond_lead', {
      p_lead_id: input.leadId,
      p_action: input.action,
      p_reason: input.reason ?? null,
      p_actual_chantier_eur: input.actualChantierEur ?? null,
    })
    if (error) throw error
    const row = (data as Array<{ success: boolean; new_status: string | null; message: string }>)?.[0]
    return row ?? { success: false, new_status: null, message: 'Réponse vide' }
  },
}
