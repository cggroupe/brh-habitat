/**
 * brh-recherche — recherche multi-entités (adresse / entreprise / dirigeant).
 *
 * Le pivot principal de l'app : un seul champ "Adresse, SIREN, SCI, nom, ville..."
 * retourne des résultats groupés par type avec liens drill-down vers les fiches.
 *
 * Pattern : queries parallèles côté client, pas de RPC SQL (cf décision 18/05).
 */
import { supabase } from '@/lib/supabase'

export interface RechercheAdresseHit {
  id: number
  adresse: string | null
  code_postal: string | null
  commune: string | null
  etiquette_dpe: string | null
  surface: number | null
  score_v2: number | null
  owner_name: string | null
  owner_siren: string | null
}

export interface RechercheEntrepriseHit {
  siren: string
  denomination: string
  commune: string | null
  code_postal: string | null
  is_active: boolean
  has_deceased_dirigeant: boolean
}

export interface RechercheDirigeantHit {
  name: string
  siren: string
  denomination: string
  qualite: string | null
  est_decede: boolean
}

export interface RechercheResults {
  query: string
  adresses: RechercheAdresseHit[]
  entreprises: RechercheEntrepriseHit[]
  dirigeants: RechercheDirigeantHit[]
}

function looksLikeSiren(q: string): boolean {
  return /^\d{9}$/.test(q.trim())
}

function looksLikeCp(q: string): boolean {
  return /^\d{5}$/.test(q.trim())
}

export const brhRechercheApi = {
  async multi(rawQuery: string): Promise<RechercheResults> {
    const q = rawQuery.trim()
    if (q.length < 2) {
      return { query: q, adresses: [], entreprises: [], dirigeants: [] }
    }

    const isSiren = looksLikeSiren(q)
    const isCp = looksLikeCp(q)
    const ilikePattern = `%${q}%`

    // ── 1. Recherche adresses (brh_dpe_prospects) ──────────────────────────
    let adressesQuery = supabase
      .from('brh_dpe_prospects')
      .select('id, adresse, code_postal, commune, etiquette_dpe, surface, score_v2, owner_name, owner_siren')
      .order('score_v2', { ascending: false, nullsFirst: false })
      .limit(20)

    if (isSiren) {
      adressesQuery = adressesQuery.eq('owner_siren', q)
    } else if (isCp) {
      adressesQuery = adressesQuery.eq('code_postal', q)
    } else {
      // OR logique : adresse OU commune OU owner_name
      adressesQuery = adressesQuery.or(
        `adresse.ilike.${ilikePattern},commune.ilike.${ilikePattern},owner_name.ilike.${ilikePattern}`,
      )
    }
    const { data: adresses, error: eA } = await adressesQuery
    if (eA) throw eA

    // ── 2. Recherche entreprises (brh_sci_companies) ───────────────────────
    let entreprisesQuery = supabase
      .from('brh_sci_companies')
      .select('siren, denomination, commune, code_postal, is_active, has_deceased_dirigeant')
      .limit(20)

    if (isSiren) {
      entreprisesQuery = entreprisesQuery.eq('siren', q)
    } else {
      entreprisesQuery = entreprisesQuery.ilike('denomination', ilikePattern)
    }
    const { data: entreprises, error: eE } = await entreprisesQuery
    if (eE) throw eE

    // ── 3. Recherche dirigeants (extraction JSONB des matches SCI) ─────────
    // RPC dédiée car PostgREST ne sait pas caster jsonb→text dans .ilike.
    const dirigeants: RechercheDirigeantHit[] = []
    if (!isSiren && !isCp && q.length >= 3) {
      const { data: sciByDirigeant, error: eD } = await supabase.rpc('brh_sci_search_dirigeant', {
        p_name: q,
        p_limit: 15,
      })
      if (!eD && sciByDirigeant) {
        for (const sciRow of sciByDirigeant) {
          const dirs = Array.isArray(sciRow.dirigeants) ? (sciRow.dirigeants as Array<Record<string, unknown>>) : []
          for (const d of dirs) {
            const fullName = [d.prenom, d.nom].filter(Boolean).join(' ').trim()
            if (!fullName) continue
            const lowerName = fullName.toLowerCase()
            if (!lowerName.includes(q.toLowerCase())) continue
            dirigeants.push({
              name: fullName,
              siren: String(sciRow.siren),
              denomination: String(sciRow.denomination ?? ''),
              qualite: (d.qualite as string) ?? null,
              est_decede: d.est_decede === true,
            })
          }
        }
      }
    }

    return {
      query: q,
      adresses: (adresses ?? []) as unknown as RechercheAdresseHit[],
      entreprises: (entreprises ?? []) as unknown as RechercheEntrepriseHit[],
      dirigeants: dirigeants.slice(0, 20),
    }
  },
}
