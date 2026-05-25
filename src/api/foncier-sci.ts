/**
 * Phase 19 Sprint B — API SCI enrichi (recherche + matching décès).
 *
 * Sources :
 *   - recherche-entreprises.api.gouv.fr (via EF sci-search)
 *   - api.deces.matchid.io (via EF sci-deces-match)
 *
 * RLS : lecture pour tout pro authentifié (cache public DataInfogreffe).
 * Audit trail décès = admin only (RGPD).
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export interface SciDirigeant {
  nom: string
  prenom: string
  qualite: string | null
  date_naissance: string | null
  est_decede: boolean
  deces_match_score: number
  /** Date du décès au format YYYY-MM-DD (depuis matchid INSEE). */
  deces_date?: string | null
  /** Commune du décès (depuis matchid INSEE). */
  deces_commune?: string | null
}

export interface SciCompany {
  siren: string
  denomination: string
  forme_juridique: string | null
  date_creation: string | null
  date_radiation: string | null
  is_active: boolean
  adresse_complete: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  code_insee_commune: string | null
  lat: number | null
  lng: number | null
  activite_principale: string | null
  activite_libelle: string | null
  capital_social_cents: number | null
  effectif: string | null
  dirigeants: SciDirigeant[]
  has_deceased_dirigeant: boolean
  succession_probable_score: number
  /** Date du décès le plus récent parmi les dirigeants (calc auto via EF). */
  latest_deces_date: string | null
  fetched_at: string
  deces_last_checked_at: string | null
  updated_at: string
  created_at: string
}

/** Tri possibles pour la liste SCI. */
export type SciSortMode =
  | 'recent_deces'  // décès le plus récent en premier (défaut quand filtre décès)
  | 'succession'    // score succession DESC
  | 'recent'        // fetched_at DESC

export interface SearchSciFilters {
  /** Texte libre (raison sociale, ville, etc.) */
  q?: string
  /** Filtrage département (22/29/35/56/44 pour Bretagne) */
  departement?: string
  /** Limite résultats (max 50) */
  limit?: number
  /** Filtres locaux (post-fetch) */
  hasDeceasedOnly?: boolean
  minSuccessionScore?: number
  /** Date min de décès (ISO YYYY-MM-DD). Filtre les SCI avec latest_deces_date >= cette date. */
  decesSince?: string
  /** Mode de tri (défaut : succession). */
  sortBy?: SciSortMode
  /** Recherche dans le cache local seulement (sans hit API) */
  cacheOnly?: boolean
  /** Force le refresh API même si cache fresh */
  forceRefresh?: boolean
}

export interface SearchSciResult {
  sci: SciCompany[]
  source: 'cache' | 'api'
  cached_at: string
  total_results?: number
  api_total?: number
  upsert_error?: string | null
}

export const foncierSciApi = {
  /**
   * Recherche libre via EF sci-search (qui hit recherche-entreprises.api.gouv.fr + cache).
   */
  async search(filters: SearchSciFilters): Promise<SearchSciResult> {
    // Mode cache local pur (pas d'appel EF) — pour la liste latérale "Mes recherches récentes"
    if (filters.cacheOnly) {
      let q = supabase.from('brh_sci_companies').select('*').limit(filters.limit ?? 50)
      if (filters.departement) q = q.eq('departement', filters.departement)
      if (filters.hasDeceasedOnly) q = q.eq('has_deceased_dirigeant', true)
      if (filters.minSuccessionScore) q = q.gte('succession_probable_score', filters.minSuccessionScore)
      if (filters.decesSince) q = q.gte('latest_deces_date', filters.decesSince)
      if (filters.q) q = q.ilike('denomination', `%${filters.q}%`)
      // Tri : recent_deces (date desc) > succession > fetched_at
      const sortBy = filters.sortBy ?? (filters.hasDeceasedOnly || filters.decesSince ? 'recent_deces' : 'succession')
      if (sortBy === 'recent_deces') {
        q = q.order('latest_deces_date', { ascending: false, nullsFirst: false })
             .order('succession_probable_score', { ascending: false })
      } else if (sortBy === 'succession') {
        q = q.order('succession_probable_score', { ascending: false }).order('latest_deces_date', { ascending: false, nullsFirst: false })
      } else {
        q = q.order('fetched_at', { ascending: false })
      }
      const { data, error } = await q
      if (error) throw error
      return {
        sci: (data ?? []) as unknown as SciCompany[],
        source: 'cache',
        cached_at: new Date().toISOString(),
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('sci-search'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        q: filters.q,
        departement: filters.departement,
        limit: filters.limit,
        force_refresh: filters.forceRefresh,
      }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `sci_search_http_${res.status}`)
    }
    const data = (await res.json()) as SearchSciResult

    // Filtres post-fetch (UI seulement)
    let sci = data.sci
    if (filters.hasDeceasedOnly) sci = sci.filter((s) => s.has_deceased_dirigeant)
    if (filters.minSuccessionScore !== undefined) {
      sci = sci.filter((s) => s.succession_probable_score >= filters.minSuccessionScore!)
    }

    return { ...data, sci }
  },

  /**
   * Fetch précis par SIREN (cache prioritaire).
   */
  async getBySiren(siren: string, forceRefresh = false): Promise<SciCompany | null> {
    if (!forceRefresh) {
      const { data, error } = await supabase
        .from('brh_sci_companies')
        .select('*')
        .eq('siren', siren)
        .maybeSingle()
      if (error) throw error
      if (data) return data as unknown as SciCompany
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('sci-search'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ siren, force_refresh: forceRefresh }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as SearchSciResult
    return data.sci[0] ?? null
  },

  /**
   * Lance le matching décès INSEE pour les dirigeants d'une SCI.
   * Met à jour brh_sci_companies + log audit trail (admin only).
   */
  async checkDeces(siren: string): Promise<{
    siren: string
    dirigeants_updated: number
    succession_score: number
    has_deceased_dirigeant: boolean
    matches_count: number
  }> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const res = await fetch(edgeFunctionUrl('sci-deces-match'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ siren }),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(j.error ?? `sci_deces_http_${res.status}`)
    }
    return (await res.json()) as {
      siren: string
      dirigeants_updated: number
      succession_score: number
      has_deceased_dirigeant: boolean
      matches_count: number
    }
  },
}
