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
  // Score de confiance du match BAN (0-1). < 0.8 = match faible (parfois faux,
  // ex: "Château de X" résolu en "Cité de X"), préférer adresse_ban=null d'affichage.
  adresse_ban_score?: number | null

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

  // PII enrichies particuliers (Sprint 10) — depuis brh_lead_pii_enriched (table
  // peuplée par /opt/stack/scripts/brh-import-pii.py depuis entity-hub).
  // RGPD : visible uniquement employé BRH via lead-visibility.ts.
  pii_full_name?: string | null
  pii_telephone?: string | null
  pii_email?: string | null
  pii_ca_total_eur?: number | null
  pii_source?: string | null
  // v5 (27/05) — historique commercial pour colonne "Dernier RDV" TABLE leads
  pii_derniere_facture?: string | null
  pii_premiere_facture?: string | null

  // Signaux d'intention (Sprint 13b) — depuis brh_intention_signals, répliqués
  // de entity-hub signals.intention_*. Scores 0-100.
  intent_score_travaux?: number | null
  intent_score_vente?: number | null
  intent_score_succession?: number | null
  intent_breakdown_travaux?: Record<string, unknown> | null
  intent_breakdown_vente?: Record<string, unknown> | null
  intent_breakdown_succession?: Record<string, unknown> | null
  intent_confidence?: number | null
}
