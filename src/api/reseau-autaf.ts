/**
 * Phase 18.8 — API bridge AUTAF.
 *
 * V1 simplifié (Genesii API pas encore active) :
 *   - Stockage manuel d'un token API AUTAF dans `brh_autaf_link.oauth_access_token_encrypted`
 *   - Pas de OAuth flow V1 (V1.5 quand `autaf/v1/oauth/*` confirmé par Genesii)
 *   - Le token est stocké en clair V1 (le champ s'appelle `_encrypted` par anticipation
 *     du chiffrement AES-GCM via pgcrypto V2)
 *
 * Documentation API attendue côté AUTAF : voir docs/wiki/autaf-bridge.md
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export interface AutafLink {
  id: string
  profile_id: string
  pro_id: string | null
  autaf_user_id: string
  autaf_username: string | null
  oauth_access_token_encrypted: string
  oauth_refresh_token_encrypted: string | null
  oauth_expires_at: string | null
  scopes: string[]
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface AutafRecommendation {
  id: string
  metier: string | null
  body: string | null
  author_name: string | null
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

export const reseauAutafApi = {
  /** Mon lien AUTAF actuel (NULL si pas configuré). */
  async getMyLink(): Promise<AutafLink | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return null
    const { data, error } = await supabase
      .from('brh_autaf_link')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AutafLink | null
  },

  /**
   * Configurer manuellement un lien AUTAF V1 (saisie token).
   * V1.5 sera remplacé par OAuth flow quand Genesii livrera l'endpoint.
   */
  async configureManually(params: {
    autafUserId: string
    autafUsername?: string
    accessToken: string
    scopes?: string[]
  }): Promise<AutafLink> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) throw new Error('Pas authentifié')

    const myProId = await getMyProId()

    const payload = {
      profile_id: user.id,
      pro_id: myProId,
      autaf_user_id: params.autafUserId,
      autaf_username: params.autafUsername ?? null,
      oauth_access_token_encrypted: params.accessToken,
      scopes: params.scopes ?? ['read_recommendations'],
      is_active: true,
      last_error: null,
    }

    // Upsert sur profile_id (UNIQUE)
    const { data, error } = await supabase
      .from('brh_autaf_link')
      .upsert(payload, { onConflict: 'profile_id' })
      .select()
      .single()
    if (error) throw error
    return data as AutafLink
  },

  /** Désactiver le bridge (sans supprimer la ligne pour audit). */
  async disable(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) throw new Error('Pas authentifié')
    const { error } = await supabase
      .from('brh_autaf_link')
      .update({ is_active: false })
      .eq('profile_id', user.id)
    if (error) throw error
  },

  /** Suppression complète (RGPD droit à l'oubli). */
  async deleteLink(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) throw new Error('Pas authentifié')
    const { error } = await supabase.from('brh_autaf_link').delete().eq('profile_id', user.id)
    if (error) throw error
  },

  /**
   * Fetch des recommandations AUTAF pour un autaf_user_id donné.
   * Passe par l'EF `autaf-recommendations-fetch` qui authentifie côté AUTAF
   * avec le token stocké, et renvoie les recos read-only.
   *
   * Retourne `{ available: false }` si bridge inactif côté AUTAF (fallback gracieux).
   */
  async fetchRecommendationsFor(autafUserId: string): Promise<{
    available: boolean
    recommendations: AutafRecommendation[]
    error?: string
  }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return { available: false, recommendations: [], error: 'no_session' }

      const res = await fetch(edgeFunctionUrl('autaf-recommendations-fetch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ autaf_user_id: autafUserId }),
      })

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        return { available: false, recommendations: [], error: json.error ?? `http_${res.status}` }
      }

      const json = (await res.json()) as {
        available: boolean
        recommendations: AutafRecommendation[]
      }
      return json
    } catch (err) {
      return {
        available: false,
        recommendations: [],
        error: err instanceof Error ? err.message : 'fetch_failed',
      }
    }
  },
}
