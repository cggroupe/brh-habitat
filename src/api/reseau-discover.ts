/**
 * Phase 18.11 — API découverte des pros bretons.
 *
 * Search public + filtres dept/métier/ville. Réutilise `brh_partner_contracts`
 * + jointure manuelle vers les tables partenaires (agences/artisans/companies)
 * pour récupérer les coordonnées d'affichage.
 */
import { supabase } from '@/lib/supabase'

export interface DiscoverPro {
  partner_contract_id: string
  partner_type: string
  signer_full_name: string
  city: string | null
  postal_code: string | null
  departement: string | null
  lat: number | null
  lng: number | null
  metiers: string[]
  endorsement_count: number
  /** Si bridge AUTAF actif → autaf_user_id (pour récupérer les recos AUTAF). */
  autaf_user_id?: string | null
}

export interface DiscoverFilters {
  departement?: string
  metier?: string
  search?: string
  partnerType?: string
  limit?: number
}

export const reseauDiscoverApi = {
  async search(filters: DiscoverFilters = {}): Promise<DiscoverPro[]> {
    const limit = Math.min(filters.limit ?? 50, 200)

    // 1) Liste des contrats actifs (filtrés partner_type si demandé)
    let q = supabase
      .from('brh_partner_contracts')
      .select('id, partner_type, signer_full_name, agence_id, artisan_id, company_id')
      .eq('status', 'active')
      .limit(limit)
    if (filters.partnerType) q = q.eq('partner_type', filters.partnerType)

    const { data: contracts, error } = await q
    if (error) throw error
    if (!contracts || contracts.length === 0) return []

    // 2) Enrichissement parallèle agences + artisans
    const agenceIds = contracts.map((c) => c.agence_id).filter(Boolean) as string[]
    const artisanIds = contracts.map((c) => c.artisan_id).filter(Boolean) as string[]

    const [agencesRes, artisansRes] = await Promise.all([
      agenceIds.length
        ? supabase
            .from('brh_agences_immo')
            .select('id, commune, code_postal, departement, latitude, longitude')
            .in('id', agenceIds)
        : Promise.resolve({ data: [], error: null }),
      artisanIds.length
        ? supabase
            .from('brh_artisans_rge')
            .select('id, commune, code_postal, departement, lat, lng, geste_specialites')
            .in('id', artisanIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const agenceById = new Map<
      string,
      { commune: string | null; code_postal: string | null; departement: string | null; latitude: number | null; longitude: number | null }
    >()
    for (const a of (agencesRes.data ?? []) as Array<{
      id: string
      commune: string | null
      code_postal: string | null
      departement: string | null
      latitude: number | null
      longitude: number | null
    }>) {
      agenceById.set(a.id, a)
    }

    const artisanById = new Map<
      string,
      { commune: string | null; code_postal: string | null; departement: string | null; lat: number | null; lng: number | null; geste_specialites: string[] | null }
    >()
    for (const a of (artisansRes.data ?? []) as Array<{
      id: string
      commune: string | null
      code_postal: string | null
      departement: string | null
      lat: number | null
      lng: number | null
      geste_specialites: string[] | null
    }>) {
      artisanById.set(a.id, a)
    }

    // 3) Compteur endorsements en batch
    const contractIds = contracts.map((c) => c.id)
    const { data: endorsements } = await supabase
      .from('brh_pro_endorsements')
      .select('endorsed_pro_id')
      .in('endorsed_pro_id', contractIds)
      .eq('is_hidden', false)

    const endorseCount = new Map<string, number>()
    for (const e of (endorsements ?? []) as Array<{ endorsed_pro_id: string }>) {
      endorseCount.set(e.endorsed_pro_id, (endorseCount.get(e.endorsed_pro_id) ?? 0) + 1)
    }

    // 4) Mapping final
    let result: DiscoverPro[] = contracts.map((c) => {
      let city: string | null = null
      let postalCode: string | null = null
      let dept: string | null = null
      let lat: number | null = null
      let lng: number | null = null
      let metiers: string[] = []
      if (c.agence_id) {
        const a = agenceById.get(c.agence_id)
        if (a) {
          city = a.commune
          postalCode = a.code_postal
          dept = a.departement
          lat = a.latitude
          lng = a.longitude
        }
      } else if (c.artisan_id) {
        const a = artisanById.get(c.artisan_id)
        if (a) {
          city = a.commune
          postalCode = a.code_postal
          dept = a.departement
          lat = a.lat
          lng = a.lng
          metiers = a.geste_specialites ?? []
        }
      }
      return {
        partner_contract_id: c.id,
        partner_type: c.partner_type,
        signer_full_name: c.signer_full_name,
        city,
        postal_code: postalCode,
        departement: dept,
        lat,
        lng,
        metiers,
        endorsement_count: endorseCount.get(c.id) ?? 0,
      }
    })

    // 5) Filtres post-mapping
    if (filters.departement) {
      result = result.filter((p) => p.departement === filters.departement)
    }
    if (filters.metier) {
      const tag = filters.metier.toLowerCase()
      result = result.filter((p) => p.metiers.some((m) => m.toLowerCase() === tag))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.signer_full_name.toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q),
      )
    }

    // Tri : endorsements DESC puis name ASC
    result.sort((a, b) => {
      if (b.endorsement_count !== a.endorsement_count) {
        return b.endorsement_count - a.endorsement_count
      }
      return a.signer_full_name.localeCompare(b.signer_full_name)
    })

    return result
  },

  /**
   * Liste des combinaisons distinctes (departement, metier) pour la génération
   * du sitemap SEO (build-time).
   */
  async listSitemapCombinations(): Promise<Array<{ departement: string; metier: string }>> {
    // Variante simplifiée : on retourne le produit cartésien des 5 dépts × ~30 métiers BTP
    // (la requête réelle filtrera RLS — ici c'est juste pour le sitemap)
    const depts = ['22', '29', '35', '56', '44']
    const metiers = [
      'isolation_combles',
      'isolation_murs',
      'isolation_sols',
      'menuiseries',
      'pac_air_eau',
      'pac_air_air',
      'chaudiere_gaz',
      'plomberie',
      'electricite',
      'couverture',
      'zinguerie',
      'maconnerie',
      'platrerie',
      'peinture',
      'carrelage',
    ]
    const combos: Array<{ departement: string; metier: string }> = []
    for (const d of depts) {
      for (const m of metiers) {
        combos.push({ departement: d, metier: m })
      }
    }
    return combos
  },
}
