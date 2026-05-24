/**
 * Phase 19 Sprint E — APIs BODACC + permis Sit@del2.
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'
import { formatLocalDate } from '@/lib/utils'

/* =========================== BODACC ============================ */

export type BodaccFamille = 'commerciales' | 'collectives' | 'radiations' | 'autres'

export interface BodaccAlert {
  id_bodacc: string
  famille_avis: BodaccFamille
  type_avis: string | null
  date_publication: string
  date_parution: string | null
  numero_parution: string | null
  siren: string | null
  denomination: string | null
  forme_juridique: string | null
  commune: string | null
  code_postal: string | null
  departement: string | null
  code_insee_commune: string | null
  adresse_complete: string | null
  lat: number | null
  lng: number | null
  prix_cession_cents: number | null
  date_cession: string | null
  bodacc_url: string | null
  fetched_at: string
}

export interface BodaccFilters {
  code_insee_commune?: string
  departement?: string
  famille?: BodaccFamille | 'all'
  days_back?: number
  limit?: number
}

export const foncierBodaccApi = {
  /** Lecture cache (rapide). */
  async listCached(filters: BodaccFilters): Promise<BodaccAlert[]> {
    let q = supabase
      .from('brh_bodacc_alerts')
      .select('*')
      .order('date_publication', { ascending: false })
      .limit(filters.limit ?? 50)

    if (filters.departement) q = q.eq('departement', filters.departement)
    if (filters.code_insee_commune) q = q.eq('code_insee_commune', filters.code_insee_commune)
    if (filters.famille && filters.famille !== 'all') q = q.eq('famille_avis', filters.famille)
    if (filters.days_back) {
      const since = formatLocalDate(new Date(Date.now() - filters.days_back * 86_400_000))
      q = q.gte('date_publication', since)
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as BodaccAlert[]
  },

  /** Refresh API (lent — fetch BODACC officiel). */
  async refresh(filters: BodaccFilters): Promise<{ alerts: BodaccAlert[]; total: number }> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('bodacc-fetch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(filters),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `bodacc_http_${res.status}`)
    }
    return (await res.json()) as { alerts: BodaccAlert[]; total: number }
  },
}

/* =========================== PERMIS SIT@DEL2 ============================ */

export type PermisType = 'PC' | 'PA' | 'PD' | 'DP' | 'DPMI' | 'DPLT' | 'autre'
export type PermisDecision =
  | 'accorde'
  | 'refuse'
  | 'tacite'
  | 'retire'
  | 'prorroge'
  | 'annule'

export interface PermisConstruire {
  id_permis: string
  type_permis: PermisType
  demandeur_nom: string | null
  demandeur_qualite: string | null
  adresse_complete: string | null
  commune: string | null
  code_postal: string | null
  departement: string | null
  code_insee_commune: string | null
  parcelle_idu: string | null
  lat: number | null
  lng: number | null
  surface_terrain_m2: number | null
  surface_plancher_m2: number | null
  destination: string | null
  nature_travaux: string | null
  nombre_logements_crees: number | null
  date_depot: string
  date_decision: string | null
  decision: PermisDecision | null
  date_dob: string | null
  date_daact: string | null
  date_validite_max: string | null
  source_year: number
  source_month: number
  fetched_at: string
}

export interface PermisFilters {
  code_insee_commune?: string
  departement?: string
  parcelle_idu?: string
  days_back?: number
  limit?: number
}

export const foncierPermisApi = {
  async list(filters: PermisFilters): Promise<PermisConstruire[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('permis-fetch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(filters),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `permis_http_${res.status}`)
    }
    const data = (await res.json()) as { permis: PermisConstruire[] }
    return data.permis
  },
}
