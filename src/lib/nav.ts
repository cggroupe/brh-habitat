/**
 * Helpers de navigation pour les fiches drill-down BRH.
 *
 * Centralise les fonctions profileBack/profileBasePath précédemment dupliquées
 * dans FicheAdresseView, FicheEntrepriseView, FichePersonneView,
 * FicheEntityLink et UnifiedLeadsView.
 */
import type { LeadProfile } from './rgpd/lead-visibility'

/**
 * URL de retour vers la liste des leads selon le profil utilisateur courant.
 */
export function profileBack(profile: LeadProfile): string {
  switch (profile) {
    case 'employe':
      return '/employe/leads'
    case 'artisan':
      return '/artisan/leads'
    case 'notaire':
      return '/notaire/leads'
    case 'agence':
    default:
      return '/agence/leads'
  }
}

/**
 * Chemin de base pour les routes fiches drill-down selon le profil.
 * Utilisé pour composer `/employe/leads/adresse/:id`, `/agence/leads/entreprise/:siren`, etc.
 */
export function profileBasePath(profile: LeadProfile): string {
  switch (profile) {
    case 'employe':
      return '/employe/leads'
    case 'artisan':
      return '/artisan/leads'
    case 'notaire':
      return '/notaire/leads'
    case 'agence':
    default:
      return '/agence/leads'
  }
}
