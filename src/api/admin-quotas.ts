/**
 * API admin quotas granulaires — audit-ux-2026-05-12 point #5.
 *
 * Permet à l'admin de :
 *   - lister agences / artisans / employés avec leur quota courant
 *   - overrider le quota custom (NULL = retour au tier default)
 *   - consulter les warnings ouverts (profils dormants, etc.)
 */
import { supabase } from '@/lib/supabase'

export type QuotaTarget = 'agence' | 'artisan' | 'employe'
export type QuotaPeriod = 'weekly' | 'monthly'

export interface ProfileWithQuota {
  target_type: QuotaTarget
  target_id: string
  display_name: string
  tier: string | null
  tier_quota: number | null
  custom_quota: number | null
  quota_period: QuotaPeriod
  current_usage: number | null
  email: string | null
  is_active: boolean
}

export interface AdminWarning {
  id: string
  target_type: QuotaTarget
  target_id: string
  warning_type: 'dormant_no_lead' | 'quota_unused' | 'inactive_login' | 'manual'
  severity: 'info' | 'warning' | 'critical'
  message: string
  metadata: Record<string, unknown>
  created_at: string
  created_by: string | null
  resolved_at: string | null
}

export const adminQuotasApi = {
  /** Liste les agences avec leur subscription + quota courant. */
  async listAgences(): Promise<ProfileWithQuota[]> {
    const { data, error } = await supabase
      .from('brh_agence_subscriptions')
      .select(`
        agence_id,
        tier,
        monthly_lead_quota,
        custom_quota,
        quota_period,
        current_month_claims,
        brh_agences_immo!inner(raison_sociale, status)
      `)
      .order('tier')
    if (error) throw error
    return (data ?? []).map((row) => {
      // Supabase typegen renvoie brh_agences_immo en array (relation FK) — on prend [0].
      const joined = (row as unknown as { brh_agences_immo: { raison_sociale: string; status: string }[] }).brh_agences_immo
      const company = Array.isArray(joined) ? joined[0] : (joined as unknown as { raison_sociale: string; status: string } | undefined)
      return {
        target_type: 'agence' as const,
        target_id: row.agence_id as string,
        display_name: company?.raison_sociale ?? 'Agence inconnue',
        tier: row.tier as string | null,
        tier_quota: row.monthly_lead_quota as number | null,
        custom_quota: row.custom_quota as number | null,
        quota_period: (row.quota_period as QuotaPeriod) ?? 'monthly',
        current_usage: row.current_month_claims as number | null,
        email: null,
        is_active: company?.status === 'partenaire',
      }
    })
  },

  /** Liste les artisans RGE avec leur quota custom. */
  async listArtisans(): Promise<ProfileWithQuota[]> {
    const { data, error } = await supabase
      .from('brh_artisans_rge')
      .select('id, nom_entreprise, email, custom_quota, quota_period, marketplace_active')
      .order('nom_entreprise')
    if (error) throw error
    return (data ?? []).map((row) => ({
      target_type: 'artisan' as const,
      target_id: row.id as string,
      display_name: (row.nom_entreprise as string) ?? 'Artisan',
      tier: null,
      tier_quota: null,
      custom_quota: row.custom_quota as number | null,
      quota_period: (row.quota_period as QuotaPeriod) ?? 'monthly',
      current_usage: null,
      email: row.email as string | null,
      is_active: Boolean(row.marketplace_active),
    }))
  },

  /** Liste les employés BRH avec leur quota + niveau + leads ce mois. */
  async listEmployes(): Promise<ProfileWithQuota[]> {
    const { data, error } = await supabase
      .from('brh_employees')
      .select('id, full_name, email, activity_level, custom_quota, quota_period, leads_received_this_month, is_active')
      .order('full_name')
    if (error) throw error
    return (data ?? []).map((row) => ({
      target_type: 'employe' as const,
      target_id: row.id as string,
      display_name: (row.full_name as string) ?? 'Employé',
      tier: row.activity_level as string | null,
      tier_quota: null, // dérivé du level côté UI (5 / 15 / 35 / ∞)
      custom_quota: row.custom_quota as number | null,
      quota_period: (row.quota_period as QuotaPeriod) ?? 'monthly',
      current_usage: row.leads_received_this_month as number | null,
      email: row.email as string | null,
      is_active: Boolean(row.is_active),
    }))
  },

  /** Override le quota custom d'un profil. customQuota=null => retire l'override. */
  async setCustomQuota(input: {
    targetType: QuotaTarget
    targetId: string
    customQuota: number | null
    period: QuotaPeriod
  }) {
    const { data, error } = await supabase.rpc('brh_admin_set_custom_quota', {
      p_target_type: input.targetType,
      p_target_id: input.targetId,
      p_custom_quota: input.customQuota,
      p_quota_period: input.period,
    })
    if (error) throw error
    return data as { ok: boolean; old_custom_quota: number | null; new_custom_quota: number | null }
  },

  /** Liste les warnings admin ouverts (profils dormants, overrides récents…). */
  async listWarnings(includeResolved = false): Promise<AdminWarning[]> {
    let query = supabase
      .from('brh_admin_profile_warnings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!includeResolved) {
      query = query.is('resolved_at', null)
    }
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as AdminWarning[]
  },

  /** Marque un warning comme traité. */
  async resolveWarning(id: string, notes?: string) {
    const { error } = await supabase
      .from('brh_admin_profile_warnings')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_notes: notes ?? null,
      })
      .eq('id', id)
    if (error) throw error
  },

  /** Déclenche manuellement la détection des profils dormants (cron-like). */
  async detectDormant(thresholdDays = 60): Promise<number> {
    const { data, error } = await supabase.rpc('brh_detect_dormant_profiles', {
      p_threshold_days: thresholdDays,
    })
    if (error) throw error
    return (data as number) ?? 0
  },
}
