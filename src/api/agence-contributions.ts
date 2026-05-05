/**
 * Phase 16.1 — API contributions agence (leads travaux apportés à BRH).
 */
import { supabase } from '@/lib/supabase'

export type ContribStatus =
  | 'submitted'
  | 'qualified'
  | 'audit_done'
  | 'quote_signed'
  | 'completed'
  | 'rejected'

export type Urgence = 'immediate' | '3mois' | '6mois' | '12mois' | 'indecis'

export interface AgenceContribution {
  id: string
  agence_id: string
  proprietaire_nom: string | null
  proprietaire_prenom: string | null
  proprietaire_telephone: string | null
  proprietaire_email: string | null
  consent_contact: boolean
  adresse: string
  code_postal: string | null
  commune: string | null
  departement: string | null
  type_batiment: string | null
  surface_estimee_m2: number | null
  etiquette_dpe_actuelle: string | null
  travaux_envisages: string[]
  budget_estime_eur: number | null
  urgence: Urgence | null
  contexte: string | null
  status: ContribStatus
  rejected_reason: string | null
  chantier_montant_ttc_cents: number | null
  commission_pct: number
  commission_amount_cents: number | null
  commission_paid_at: string | null
  created_at: string
  updated_at: string
}

export type ContributionInsert = Omit<
  AgenceContribution,
  | 'id'
  | 'status'
  | 'rejected_reason'
  | 'chantier_montant_ttc_cents'
  | 'commission_pct'
  | 'commission_amount_cents'
  | 'commission_paid_at'
  | 'created_at'
  | 'updated_at'
> & { submitted_by?: string | null }

export interface AgenceProgression {
  agence_id: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  contributions_count: number
  contributions_qualified: number
  chantiers_signes: number
  chantiers_completes: number
  total_commission_due_cents: number
  total_commission_paid_cents: number
  bonus_leads_unlocked: number
  bonus_leads_consumed: number
  stats_updated_at: string
}

/** Quota leads/mois selon le tier (avant bonus contributions). */
export const TIER_BASE_QUOTA: Record<AgenceProgression['tier'], number | null> = {
  bronze: 5,
  silver: 30,
  gold: 100,
  platinum: null, // illimité
}

export const TIER_LABELS_FR: Record<AgenceProgression['tier'], string> = {
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
}

export const TIER_THRESHOLDS = {
  bronze: { chantiers: 0, next: 'silver', next_chantiers: 3 },
  silver: { chantiers: 3, next: 'gold', next_chantiers: 10 },
  gold: { chantiers: 10, next: 'platinum', next_chantiers: 25 },
  platinum: { chantiers: 25, next: null, next_chantiers: null },
} as const

/** Features débloquées par tier. */
export const TIER_FEATURES: Record<
  AgenceProgression['tier'],
  Array<{ key: string; label: string }>
> = {
  bronze: [
    { key: 'leads_5', label: '5 leads vente / mois' },
    { key: 'map_basic', label: 'Carte chaleur Bretagne' },
  ],
  silver: [
    { key: 'leads_30', label: '30 leads vente / mois' },
    { key: 'team_stats', label: 'Statistiques équipe' },
    { key: 'export_csv', label: 'Export CSV des leads claim' },
  ],
  gold: [
    { key: 'leads_100', label: '100 leads vente / mois' },
    { key: 'letters_ai', label: 'Génération courriers IA propriétaire' },
    { key: 'heatmap_full', label: 'Heatmap densité avancée' },
    { key: 'priority_support', label: 'Support prioritaire 24h' },
  ],
  platinum: [
    { key: 'leads_unlimited', label: 'Leads illimités' },
    { key: 'api_access', label: 'Accès API REST' },
    { key: 'co_branding', label: 'Co-branding sur le site BRH' },
    { key: 'custom_zones', label: 'Zones EPCI personnalisées' },
    { key: 'account_manager', label: 'Account manager dédié' },
  ],
}

export const agenceContributionsApi = {
  async list(agenceId: string): Promise<AgenceContribution[]> {
    const { data, error } = await supabase
      .from('brh_agence_contributions')
      .select('*')
      .eq('agence_id', agenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AgenceContribution[]
  },

  async submit(input: ContributionInsert): Promise<AgenceContribution> {
    const { data, error } = await supabase
      .from('brh_agence_contributions')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as AgenceContribution
  },

  async myProgression(agenceId: string): Promise<AgenceProgression | null> {
    const { data, error } = await supabase
      .from('brh_agence_progression')
      .select('*')
      .eq('agence_id', agenceId)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AgenceProgression | null
  },
}
