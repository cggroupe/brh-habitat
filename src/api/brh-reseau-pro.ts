/**
 * API client pour la feature "Réseau Pro" — annuaire 15k entreprises bretonnes
 * que les employés démarchent pour intégrer au réseau BRH.
 *
 * Tables : brh_reseau_prospects + brh_reseau_claims (ownership progressif)
 * Migration : 20260527230000_brh_reseau_prospects.sql
 *
 * Logique claim : premier employé à contacter un prospect le verrouille.
 * Les autres employés le voient comme "Suivi par {nom}" sans accès aux contacts.
 */
import { supabase } from '@/lib/supabase'

export type ReseauClaimStatus = 'contacte' | 'rdv_pris' | 'partenaire' | 'refus' | 'abandonne'
export type ReseauContactMethod = 'phone' | 'email' | 'linkedin' | 'visit' | 'other'
export type ReseauClaimFilter = 'all' | 'free' | 'mine'

export interface ReseauProspectListItem {
  id: number
  nom: string
  secteur: string | null
  metier_categorie: string | null
  ville: string | null
  code_postal: string | null
  departement: string | null
  description: string | null
  is_rge: boolean
  rge_certifications: string | null
  note_google: number | null
  nb_avis: number
  logo_url: string | null
  telephone: string | null
  email: string | null
  site_web: string | null
  linkedin: string | null
  is_claimed: boolean
  claimed_by_user_id: string | null
  claimed_by_name: string | null
  claimed_at: string | null
  claim_status: ReseauClaimStatus | null
  effectif: string | null
  total_count: number
}

export interface ReseauProspectFull {
  id: number
  nom: string
  secteur: string | null
  metier_categorie: string | null
  nom_gerant: string | null
  prenom_gerant: string | null
  qualite_gerant: string | null
  tous_dirigeants: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  departement: string | null
  latitude: number | null
  longitude: number | null
  siret: string | null
  siren: string | null
  naf: string | null
  naf_libelle: string | null
  forme_juridique: string | null
  effectif: string | null
  tranche_effectif: string | null
  chiffre_affaires: string | null
  date_creation: string | null
  description: string | null
  prestations: string | null
  logo_url: string | null
  page_pagesjaunes: string | null
  note_google: number | null
  nb_avis: number
  is_rge: boolean
  rge_certifications: string | null
  rge_domaines: string | null
  rge_date_validite: string | null
  sources: string | null
  date_scraping: string | null

  is_claimed: boolean
  claim: {
    user_id: string
    user_name: string | null
    claimed_at: string
    status: ReseauClaimStatus
    contact_method: ReseauContactMethod | null
    last_action_at: string
    notes: string | null
  } | null

  can_see_contacts: boolean
  contacts: {
    telephone: string | null
    email: string | null
    email_site_web: string | null
    site_web: string | null
    site_web_titre: string | null
    site_web_description: string | null
    facebook: string | null
    instagram: string | null
    linkedin: string | null
    tiktok: string | null
    youtube: string | null
  } | null
}

export interface ReseauListFilters {
  dept?: '22' | '29' | '35' | '56' | null
  secteur?: 'BTP' | 'Immo/Partenariat' | null
  metier?: string | null
  filterRge?: boolean
  filterWithEmail?: boolean
  filterWithSite?: boolean
  search?: string | null
  limit?: number
  offset?: number
  claimFilter?: ReseauClaimFilter
}

export interface ReseauStats {
  total: number
  claimed: number
  free: number
  my_claims: number
  by_dept: Record<string, number>
  by_metier: Array<{ metier: string; n: number }>
  by_status: Record<string, number>
  top_employees: Array<{ user_id: string; name: string | null; n: number }>
}

export const brhReseauApi = {
  async list(filters: ReseauListFilters = {}): Promise<ReseauProspectListItem[]> {
    const { data, error } = await supabase.rpc('brh_reseau_prospects_list', {
      p_dept: filters.dept ?? undefined,
      p_secteur: filters.secteur ?? undefined,
      p_metier: filters.metier ?? undefined,
      p_filter_rge: filters.filterRge ?? false,
      p_filter_with_email: filters.filterWithEmail ?? false,
      p_filter_with_site: filters.filterWithSite ?? false,
      p_search: filters.search ?? undefined,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
      p_claim_filter: filters.claimFilter ?? 'all',
    })
    if (error) throw error
    return (data ?? []) as ReseauProspectListItem[]
  },

  async get(id: number): Promise<ReseauProspectFull> {
    const { data, error } = await supabase.rpc('brh_reseau_prospect_get', { p_id: id })
    if (error) throw error
    if (!data) throw new Error('Prospect introuvable')
    return data as unknown as ReseauProspectFull
  },

  async claim(args: {
    id: number
    method?: ReseauContactMethod
    notes?: string
  }): Promise<ReseauProspectFull> {
    const { data, error } = await supabase.rpc('brh_reseau_claim', {
      p_id: args.id,
      p_method: args.method ?? undefined,
      p_notes: args.notes ?? undefined,
    })
    if (error) throw error
    return data as unknown as ReseauProspectFull
  },

  async updateClaim(args: {
    id: number
    status?: ReseauClaimStatus
    notes?: string
  }): Promise<ReseauProspectFull> {
    const { data, error } = await supabase.rpc('brh_reseau_claim_update', {
      p_id: args.id,
      p_status: args.status ?? undefined,
      p_notes: args.notes ?? undefined,
    })
    if (error) throw error
    return data as unknown as ReseauProspectFull
  },

  async unclaim(id: number): Promise<ReseauProspectFull> {
    const { data, error } = await supabase.rpc('brh_reseau_unclaim', { p_id: id })
    if (error) throw error
    return data as unknown as ReseauProspectFull
  },

  async stats(scope: 'global' | 'mine' = 'global'): Promise<ReseauStats> {
    const { data, error } = await supabase.rpc('brh_reseau_stats', { p_scope: scope })
    if (error) throw error
    return data as unknown as ReseauStats
  },
}

export const RESEAU_STATUS_LABELS: Record<ReseauClaimStatus, string> = {
  contacte: 'Contacté',
  rdv_pris: 'RDV pris',
  partenaire: 'Partenaire actif',
  refus: 'Refus',
  abandonne: 'Abandonné',
}

export const RESEAU_STATUS_COLORS: Record<ReseauClaimStatus, string> = {
  contacte: 'bg-blue-100 text-blue-800 ring-blue-200',
  rdv_pris: 'bg-amber-100 text-amber-900 ring-amber-200',
  partenaire: 'bg-[#00600a]/10 text-[#00600a] ring-[#00600a]/30',
  refus: 'bg-red-100 text-red-800 ring-red-200',
  abandonne: 'bg-stone-200 text-stone-700 ring-stone-300',
}

export const RESEAU_METHOD_LABELS: Record<ReseauContactMethod, string> = {
  phone: 'Téléphone',
  email: 'Email',
  linkedin: 'LinkedIn',
  visit: 'Visite',
  other: 'Autre',
}

/**
 * Mappe le `metier_categorie` d'un prospect réseau pro vers l'audience d'un
 * template email (brh_email_templates.target_audience). Permet de proposer
 * uniquement les templates pertinents pour chaque prospect.
 *
 * Mapping :
 *  - "Agence immobilière" → agence_immo
 *  - "Architecte" → architecte
 *  - "Maître d'œuvre" / "Bureau d'études" → maitre_oeuvre
 *  - Tout autre métier BTP (Plombier, Maçon, Électricien…) → artisan
 *  - Reste (secteur Immo/Partenariat hors agence) → autre
 */
export type EmailTargetAudience = 'artisan' | 'agence_immo' | 'architecte' | 'maitre_oeuvre' | 'autre'

export function metierToEmailAudience(
  metier: string | null | undefined,
  secteur: string | null | undefined,
): EmailTargetAudience {
  if (!metier) return 'autre'
  if (metier === 'Agence immobilière') return 'agence_immo'
  if (metier === 'Architecte') return 'architecte'
  if (metier === "Maître d'œuvre" || metier === "Bureau d'études") return 'maitre_oeuvre'
  if (secteur === 'BTP') return 'artisan'
  return 'autre'
}

/**
 * Récupère l'historique des emails envoyés à un destinataire (par email).
 * Sert à afficher l'historique sur la fiche prospect réseau pro.
 */
export interface EmailSendHistoryItem {
  id: string
  template_id: string | null
  subject: string
  sent_at: string
  status: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
  employee_id: string
}

export async function fetchEmailsSentTo(recipientEmail: string): Promise<EmailSendHistoryItem[]> {
  const { data, error } = await supabase
    .from('brh_email_sends')
    .select('id, template_id, subject, sent_at, status, employee_id')
    .eq('recipient_email', recipientEmail)
    .order('sent_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as EmailSendHistoryItem[]
}
