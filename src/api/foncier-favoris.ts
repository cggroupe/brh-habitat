/**
 * Phase 19 Sprint A — API favoris parcelles agence.
 *
 * RLS : owner agence (via helper SQL `brh_user_agence_id()`).
 */
import { supabase } from '@/lib/supabase'

export type FavoriStatus = 'a_etudier' | 'contact_pris' | 'offre_faite' | 'vendu' | 'abandonne'
export type FavoriPriorite = 'haute' | 'normale' | 'basse'

export interface FoncierFavori {
  id: string
  tenant_id: string
  agence_id: string
  added_by: string | null
  parcelle_idu: string
  parcelle_commune: string | null
  parcelle_code_postal: string | null
  parcelle_departement: string | null
  parcelle_contenance_m2: number | null
  tags: string[]
  notes: string | null
  priorite: FavoriPriorite
  status: FavoriStatus
  status_updated_at: string
  related_prospect_id: string | null
  created_at: string
  updated_at: string
}

async function getMyAgenceId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return null

  // Cas signataire direct
  const { data: signer } = await supabase
    .from('brh_partner_contracts')
    .select('agence_id')
    .eq('signer_profile_id', user.id)
    .eq('status', 'active')
    .eq('partner_type', 'agence_immo')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (signer?.agence_id) return signer.agence_id

  // Cas member (Phase 16.1 brh_agence_members)
  const { data: member } = await supabase
    .from('brh_agence_members')
    .select('agence_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle()
  return member?.agence_id ?? null
}

export const foncierFavorisApi = {
  /** Liste des favoris de l'agence courante. */
  async listMine(): Promise<FoncierFavori[]> {
    const { data, error } = await supabase
      .from('brh_agence_favoris_parcelles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as FoncierFavori[]
  },

  async getById(id: string): Promise<FoncierFavori | null> {
    const { data, error } = await supabase
      .from('brh_agence_favoris_parcelles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as FoncierFavori | null
  },

  async add(params: {
    parcelleIdu: string
    parcelleCommune?: string
    parcelleCodePostal?: string
    parcelleDepartement?: string
    parcelleContenanceM2?: number
    tags?: string[]
    notes?: string
    priorite?: FavoriPriorite
  }): Promise<FoncierFavori> {
    const myAgenceId = await getMyAgenceId()
    if (!myAgenceId) throw new Error('Pas d\'agence active pour cet utilisateur')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('brh_agence_favoris_parcelles')
      .insert({
        agence_id: myAgenceId,
        added_by: user?.id ?? null,
        parcelle_idu: params.parcelleIdu,
        parcelle_commune: params.parcelleCommune ?? null,
        parcelle_code_postal: params.parcelleCodePostal ?? null,
        parcelle_departement: params.parcelleDepartement ?? null,
        parcelle_contenance_m2: params.parcelleContenanceM2 ?? null,
        tags: params.tags ?? [],
        notes: params.notes ?? null,
        priorite: params.priorite ?? 'normale',
      })
      .select()
      .single()
    if (error) throw error
    return data as FoncierFavori
  },

  async update(
    id: string,
    patch: Partial<{
      tags: string[]
      notes: string | null
      priorite: FavoriPriorite
      status: FavoriStatus
    }>,
  ): Promise<FoncierFavori> {
    const { data, error } = await supabase
      .from('brh_agence_favoris_parcelles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FoncierFavori
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('brh_agence_favoris_parcelles')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** True si la parcelle est déjà en favori pour l'agence courante. */
  async isFavori(parcelleIdu: string): Promise<{ isFavori: boolean; favoriId: string | null }> {
    const myAgenceId = await getMyAgenceId()
    if (!myAgenceId) return { isFavori: false, favoriId: null }
    const { data } = await supabase
      .from('brh_agence_favoris_parcelles')
      .select('id')
      .eq('agence_id', myAgenceId)
      .eq('parcelle_idu', parcelleIdu)
      .maybeSingle()
    return { isFavori: !!data, favoriId: data?.id ?? null }
  },
}
