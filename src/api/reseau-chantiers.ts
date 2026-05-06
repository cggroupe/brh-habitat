/**
 * Phase 18.7 — API marketplace chantiers `/reseau/chantiers`.
 *
 * KILLER feature. RLS (cf. migration 20260706300000) :
 *   - SELECT : publisher OR (status open/negotiating/assigned/signed AND visibility public OR
 *              (visibility reseau AND brh_pro_in_network(viewer, publisher)))
 *   - INSERT : publisher_pro_id = mon partner_contract_id
 *   - UPDATE : publisher_pro_id = moi
 *   - DELETE : publisher_pro_id = moi AND status='draft'
 */
import { supabase } from '@/lib/supabase'

export type ContractMode = 'sous_traitance' | 'co_traitance' | 'apport'
export type ChantierStatus =
  | 'draft'
  | 'open'
  | 'negotiating'
  | 'assigned'
  | 'signed'
  | 'closed'
  | 'cancelled'
export type ChantierVisibility = 'public' | 'reseau' | 'prive'

export interface ChantierOffer {
  id: string
  tenant_id: string
  publisher_pro_id: string
  title: string
  description: string | null
  metiers_recherches: string[]
  adresse: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  lat: number | null
  lng: number | null
  budget_cents: number | null
  budget_visible: boolean
  start_date: string | null
  duration_weeks: number | null
  contract_mode: ContractMode
  commission_offer_pct: number
  related_prospect_id: string | null
  status: ChantierStatus
  visibility: ChantierVisibility
  expires_at: string | null
  closed_at: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
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

export interface ListChantiersFilters {
  /** Filtre par statut (défaut : open uniquement). */
  status?: ChantierStatus | ChantierStatus[]
  /** Mes propres offres uniquement. */
  mineOnly?: boolean
  /** Filtre département. */
  departement?: string
  /** Limite (défaut 50). */
  limit?: number
}

export const reseauChantiersApi = {
  async list(filters: ListChantiersFilters = {}): Promise<ChantierOffer[]> {
    const limit = Math.min(filters.limit ?? 50, 200)
    let q = supabase.from('brh_chantier_offers').select('*').limit(limit)

    if (filters.mineOnly) {
      const myId = await getMyProId()
      if (!myId) return []
      q = q.eq('publisher_pro_id', myId)
    }

    const status = filters.status ?? 'open'
    if (Array.isArray(status)) q = q.in('status', status)
    else q = q.eq('status', status)

    if (filters.departement) q = q.eq('departement', filters.departement)

    q = q.order('created_at', { ascending: false })

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as ChantierOffer[]
  },

  async getById(id: string): Promise<ChantierOffer | null> {
    const { data, error } = await supabase
      .from('brh_chantier_offers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as ChantierOffer | null
  },

  async create(payload: {
    title: string
    description?: string
    metiers_recherches: string[]
    adresse?: string
    code_postal?: string
    commune?: string
    departement?: string
    lat?: number
    lng?: number
    budget_cents?: number
    budget_visible?: boolean
    start_date?: string
    duration_weeks?: number
    contract_mode?: ContractMode
    commission_offer_pct?: number
    visibility?: ChantierVisibility
    related_prospect_id?: string
    expires_at?: string
    /** Si true → status='open' direct. Si false → status='draft'. */
    publishImmediately?: boolean
  }): Promise<ChantierOffer> {
    const myId = await getMyProId()
    if (!myId) throw new Error('Pas de partner_contract actif')

    const { publishImmediately, ...rest } = payload
    const { data, error } = await supabase
      .from('brh_chantier_offers')
      .insert({
        publisher_pro_id: myId,
        title: rest.title,
        description: rest.description ?? null,
        metiers_recherches: rest.metiers_recherches,
        adresse: rest.adresse ?? null,
        code_postal: rest.code_postal ?? null,
        commune: rest.commune ?? null,
        departement: rest.departement ?? null,
        lat: rest.lat ?? null,
        lng: rest.lng ?? null,
        budget_cents: rest.budget_cents ?? null,
        budget_visible: rest.budget_visible ?? true,
        start_date: rest.start_date ?? null,
        duration_weeks: rest.duration_weeks ?? null,
        contract_mode: rest.contract_mode ?? 'sous_traitance',
        commission_offer_pct: rest.commission_offer_pct ?? 5,
        visibility: rest.visibility ?? 'public',
        related_prospect_id: rest.related_prospect_id ?? null,
        expires_at: rest.expires_at ?? null,
        status: publishImmediately === false ? 'draft' : 'open',
      })
      .select()
      .single()
    if (error) throw error
    return data as ChantierOffer
  },

  async update(id: string, patch: Partial<Omit<ChantierOffer, 'id' | 'tenant_id' | 'publisher_pro_id' | 'created_at' | 'updated_at'>>): Promise<ChantierOffer> {
    const { data, error } = await supabase
      .from('brh_chantier_offers')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ChantierOffer
  },

  async close(id: string): Promise<ChantierOffer> {
    return this.update(id, { status: 'closed', closed_at: new Date().toISOString() })
  },

  async cancel(id: string, reason?: string): Promise<ChantierOffer> {
    return this.update(id, {
      status: 'cancelled',
      cancelled_reason: reason ?? null,
      closed_at: new Date().toISOString(),
    })
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('brh_chantier_offers').delete().eq('id', id)
    if (error) throw error
  },
}
