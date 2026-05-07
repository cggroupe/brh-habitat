/**
 * Phase 19 Sprint C — API sociodémo communes + DVF historique.
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export interface CommuneSociodemo {
  code_insee: string
  nom_commune: string
  code_postal: string | null
  departement: string | null
  code_epci: string | null
  population: number | null

  // Loyers (en cents €/m²/mois)
  loyer_appartement_eur_cents: number | null
  loyer_maison_eur_cents: number | null
  loyer_t1_t2_eur_cents: number | null
  loyer_t3_plus_eur_cents: number | null
  loyer_source_year: number | null

  // Élections / élus
  elections_resultats: Record<string, unknown>
  couleur_politique: string | null
  elus_municipaux: Array<{
    nom?: string
    prenom?: string
    fonction?: string
    parti?: string
  }>
  maire_nom: string | null
  maire_prenom: string | null
  maire_parti: string | null

  // Filosofi
  revenu_median_disponible_eur_cents: number | null
  taux_pauvrete_pct: number | null
  decile_revenu_median: number | null
  filosofi_source_year: number | null

  // Recensement
  pct_proprietaires: number | null
  pct_residences_secondaires: number | null
  pct_logements_avant_1975: number | null
  pct_csp_cadres: number | null
  pct_csp_employes: number | null
  pct_csp_ouvriers: number | null
  recensement_source_year: number | null

  // Gentrification
  gentrification_score: number | null
  gentrification_label: string | null

  fetched_at: string
  updated_at: string
}

export interface DvfMutation {
  id: string
  id_mutation: string
  date_mutation: string
  nature_mutation: string
  valeur_fonciere_cents: number | null
  code_postal: string | null
  commune: string | null
  code_insee_commune: string | null
  departement: string | null
  type_local: string | null
  surface_reelle_bati: number | null
  nombre_pieces_principales: number | null
  surface_terrain: number | null
  parcelle_idu: string | null
  lat: number | null
  lng: number | null
  source_year: number
  archived_at: string
}

export interface DvfCommuneStats {
  total_mutations: number
  prix_median_eur_cents: number | null
  prix_moyen_eur_cents: number | null
  prix_min_eur_cents: number | null
  prix_max_eur_cents: number | null
  surface_median_m2: number | null
}

export const foncierSociodemoApi = {
  /** Fetch sociodémo d'une commune (cache 90j). */
  async fetchByInsee(codeInsee: string, forceRefresh = false): Promise<CommuneSociodemo | null> {
    if (!forceRefresh) {
      const { data, error } = await supabase
        .from('brh_communes_sociodemo')
        .select('*')
        .eq('code_insee', codeInsee)
        .maybeSingle()
      if (error) throw error
      if (data) {
        const ageMs = Date.now() - new Date(data.fetched_at).getTime()
        if (ageMs < 90 * 86_400_000) return data as CommuneSociodemo
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('commune-sociodemo-fetch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ code_insee: codeInsee, force_refresh: forceRefresh }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `sociodemo_http_${res.status}`)
    }
    const data = (await res.json()) as { commune: CommuneSociodemo; source: 'cache' | 'api' }
    return data.commune
  },

  /** Stats DVF agrégées d'une commune (RPC SQL). */
  async getDvfStats(codeInsee: string, yearsBack = 5): Promise<DvfCommuneStats | null> {
    const { data, error } = await supabase.rpc('brh_dvf_commune_stats', {
      p_code_insee: codeInsee,
      p_years_back: yearsBack,
    })
    if (error) throw error
    const row = (data as DvfCommuneStats[] | null)?.[0]
    return row ?? null
  },

  /** Mutations DVF historiques pour une parcelle. */
  async getDvfByParcelle(parcelleIdu: string): Promise<DvfMutation[]> {
    const { data, error } = await supabase
      .from('brh_dvf_archive')
      .select('*')
      .eq('parcelle_idu', parcelleIdu)
      .order('date_mutation', { ascending: false })
    if (error) throw error
    return (data ?? []) as DvfMutation[]
  },

  /** Mutations DVF récentes commune (limité). */
  async getDvfByCommune(codeInsee: string, limit = 50): Promise<DvfMutation[]> {
    const { data, error } = await supabase
      .from('brh_dvf_archive')
      .select('*')
      .eq('code_insee_commune', codeInsee)
      .order('date_mutation', { ascending: false })
      .limit(Math.min(limit, 200))
    if (error) throw error
    return (data ?? []) as DvfMutation[]
  },
}
