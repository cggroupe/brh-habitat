/**
 * Type étendu pour les leads dans l'écran unifié.
 *
 * Superset du `FoncierProspectRow` (RPC `brh_foncier_prospects_table`) avec
 * champs optionnels qui viendront d'autres endpoints (SCI, succession, DVF, OSINT)
 * à brancher dans une session ultérieure.
 *
 * Tant qu'ils ne sont pas peuplés côté backend, ils restent `undefined` —
 * les composants RGPD-aware ne les affichent que s'ils sont présents.
 */
import type { FoncierProspectRow } from '@/api/foncier-prospects-table'

export interface LeadRow extends FoncierProspectRow {
  // Adresse BAN-normalisée (numéro + rue + CP + commune) — 99,97 % des leads
  adresse_ban?: string | null

  // Coordonnées (pour la carte) — vient de brh_dpe_prospects.lat/lng
  latitude?: number | null
  longitude?: number | null

  // Contacts particulier (BRH interne uniquement)
  telephone?: string | null
  email?: string | null
  full_name?: string | null

  // Propriétaire personne morale (info publique)
  owner_siren?: string | null
  owner_name?: string | null
  owner_type?: string | null

  // Succession (info publique si décès matché)
  succession_active?: boolean | null
  deces_date?: string | null
  score_succession?: number | null

  // DVF historique
  dvf_prix?: number | null
  dvf_date?: string | null
  dvf_type?: string | null
  dvf_distance_m?: number | null

  // Détails techniques DPE (Phase 11+)
  ubat?: number | null
  qualite_isolation_murs?: string | null
  qualite_isolation_menuiseries?: string | null
  qualite_isolation_plancher_bas?: string | null
  qualite_isolation_plancher_haut?: string | null
  isolation_toiture_detail?: string | null
  type_ventilation?: string | null
  description_chauffage?: string | null
  description_ecs?: string | null

  // Score vente (BRH interne)
  score_vente?: number | null
}
