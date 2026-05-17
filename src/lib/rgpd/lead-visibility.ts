/**
 * Matrice RGPD : qui voit quoi selon le profil utilisateur.
 *
 * Profils :
 * - 'employe'  : BRH interne — voit TOUT (PII, OSINT, scores comportementaux personnels)
 * - 'agence'   : Agence immobilière externe — voit DPE, SCI, succession, DVF, intention travaux ;
 *                PAS d'email/téléphone particulier, PAS d'OSINT personnel
 * - 'artisan'  : Artisan RGE externe — voit DPE+détails techniques + intention travaux ;
 *                PAS de PII particulier
 * - 'notaire'  : (V2) Notaire succession — voit SCI+décès+DVF+adresses
 *
 * Cette matrice est consommée par UnifiedLeadsView et LeadDetailModal.
 */

export type LeadProfile = 'employe' | 'agence' | 'artisan' | 'notaire'

export type VisibilityField =
  // Identité particulier
  | 'particulier_nom_complet'
  | 'particulier_phone'
  | 'particulier_email'
  // DPE / bâtiment
  | 'dpe_basic'
  | 'dpe_details_techniques' // Ubat, isolation, ventilation, déperditions
  | 'dpe_personne_morale' // qui est propriétaire (si SCI)
  // SCI / Société
  | 'sci_info'
  | 'sci_dirigeants'
  | 'sci_succession'
  // DVF public
  | 'dvf_mutations'
  // OSINT BRH interne uniquement
  | 'osint_holehe'
  | 'osint_sherlock'
  | 'osint_apify_social'
  | 'osint_searx'
  | 'osint_emailrep'
  // Scoring
  | 'score_intention_travaux'
  | 'score_intention_vente_personnel' // BRH interne uniquement
  | 'score_intention_succession'
  | 'score_brh_v1'
  // RDV / Notes terrain
  | 'rdv_terrain_notes'
  | 'rdv_terrain_chauffage_type' // type de chauffage (info technique OK)
  | 'rdv_terrain_age_proprio' // age — discutable RGPD

/**
 * Matrice : true = visible, false = caché, 'anonymized' = visible mais anonymisé.
 */
type VisibilityValue = boolean | 'anonymized'

export const RGPD_MATRIX: Record<LeadProfile, Record<VisibilityField, VisibilityValue>> = {
  employe: {
    // TOUT pour BRH interne
    particulier_nom_complet: true,
    particulier_phone: true,
    particulier_email: true,
    dpe_basic: true,
    dpe_details_techniques: true,
    dpe_personne_morale: true,
    sci_info: true,
    sci_dirigeants: true,
    sci_succession: true,
    dvf_mutations: true,
    osint_holehe: true,
    osint_sherlock: true,
    osint_apify_social: true,
    osint_searx: true,
    osint_emailrep: true,
    score_intention_travaux: true,
    score_intention_vente_personnel: true,
    score_intention_succession: true,
    score_brh_v1: true,
    rdv_terrain_notes: true,
    rdv_terrain_chauffage_type: true,
    rdv_terrain_age_proprio: true,
  },
  agence: {
    // PII particulier : NON. SCI/DPE/succession/DVF : OUI.
    particulier_nom_complet: 'anonymized', // "Propriétaire X" si particulier
    particulier_phone: false,
    particulier_email: false,
    dpe_basic: true,
    dpe_details_techniques: true,
    dpe_personne_morale: true,
    sci_info: true,
    sci_dirigeants: true, // info publique
    sci_succession: true,
    dvf_mutations: true,
    osint_holehe: false,
    osint_sherlock: false,
    osint_apify_social: false,
    osint_searx: false,
    osint_emailrep: false,
    score_intention_travaux: true,
    score_intention_vente_personnel: false,
    score_intention_succession: true,
    score_brh_v1: true,
    rdv_terrain_notes: false, // notes terrain BRH interne
    rdv_terrain_chauffage_type: true, // info technique seule OK
    rdv_terrain_age_proprio: false, // info personnelle
  },
  artisan: {
    // Cible BTP : DPE+technique. PAS de PII, PAS d'info SCI dirigeant.
    particulier_nom_complet: 'anonymized',
    particulier_phone: false,
    particulier_email: false,
    dpe_basic: true,
    dpe_details_techniques: true,
    dpe_personne_morale: true,
    sci_info: true,
    sci_dirigeants: false, // artisan n'a pas besoin
    sci_succession: false,
    dvf_mutations: false, // artisan n'a pas besoin
    osint_holehe: false,
    osint_sherlock: false,
    osint_apify_social: false,
    osint_searx: false,
    osint_emailrep: false,
    score_intention_travaux: true,
    score_intention_vente_personnel: false,
    score_intention_succession: false,
    score_brh_v1: true,
    rdv_terrain_notes: false,
    rdv_terrain_chauffage_type: true,
    rdv_terrain_age_proprio: false,
  },
  notaire: {
    // Spécialisé succession
    particulier_nom_complet: true, // succession en cours = nom décédé public
    particulier_phone: false,
    particulier_email: false,
    dpe_basic: true,
    dpe_details_techniques: false,
    dpe_personne_morale: true,
    sci_info: true,
    sci_dirigeants: true,
    sci_succession: true,
    dvf_mutations: true,
    osint_holehe: false,
    osint_sherlock: false,
    osint_apify_social: false,
    osint_searx: false,
    osint_emailrep: false,
    score_intention_travaux: false,
    score_intention_vente_personnel: false,
    score_intention_succession: true,
    score_brh_v1: false,
    rdv_terrain_notes: false,
    rdv_terrain_chauffage_type: false,
    rdv_terrain_age_proprio: false,
  },
}

export function canSee(profile: LeadProfile, field: VisibilityField): VisibilityValue {
  return RGPD_MATRIX[profile][field]
}

/**
 * Anonymise un nom pour les profils externes : "Jean DUPONT" → "Propriétaire D."
 */
export function anonymizeName(fullName: string | null | undefined): string {
  if (!fullName) return 'Propriétaire'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return 'Propriétaire'
  const lastName = parts[parts.length - 1]
  const initial = lastName ? lastName[0].toUpperCase() + '.' : ''
  return `Propriétaire ${initial}`
}

/**
 * Helper pour afficher un nom selon le profil.
 * Si SCI/personne morale : afficher le nom (info publique).
 * Si particulier : selon RGPD matrice.
 */
export function displayName(
  profile: LeadProfile,
  fullName: string | null | undefined,
  isPersonneMorale: boolean = false,
): string {
  if (isPersonneMorale && fullName) return fullName // SCI = nom public
  const vis = canSee(profile, 'particulier_nom_complet')
  if (vis === true) return fullName ?? 'Inconnu'
  if (vis === 'anonymized') return anonymizeName(fullName)
  return 'Propriétaire'
}
