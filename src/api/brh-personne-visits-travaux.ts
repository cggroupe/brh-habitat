/**
 * brh-personne-visits-travaux — visites employé + travaux réalisés par poste.
 *
 * Permet aux commerciaux BRH de :
 *  - Marquer un client comme "vu" (avec note optionnelle)
 *  - Voir l'historique de qui a visité quand (éviter doublons)
 *  - Cataloguer les travaux réalisés par poste technique (isolation/chauffage/…)
 *    avec l'entreprise réalisatrice et la date.
 */
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database-generated'

export interface PersonneVisit {
  id: string
  employee_id: string
  employee_name: string
  employee_email: string | null
  seen_at: string
  visit_type: 'visite_terrain' | 'appel' | 'email' | 'rdv_planifie' | 'autre'
  note: string | null
}

export type PosteTechnique =
  | 'murs'
  | 'toiture'
  | 'plancher_bas'
  | 'fenetres'
  | 'chauffage'
  | 'ventilation'
  | 'eau_chaude'
  | 'tableau_electrique'
  | 'autre'

export type EtatTravaux =
  | 'non_realise'
  | 'passoire'
  | 'partiel'
  | 'realise_recent'
  | 'realise_ancien'
  | 'inconnu'

export interface PersonneTravaux {
  id: string
  poste_technique: PosteTechnique
  etat: EtatTravaux
  description: string | null
  entreprise_realisatrice: string | null
  date_travaux: string | null
  cout_eur: number | null
  created_by_name: string | null
  updated_at: string
}

export interface TravauxPatch {
  etat?: EtatTravaux
  description?: string | null
  entreprise_realisatrice?: string | null
  date_travaux?: string | null
  cout_eur?: number | null
}

export const brhVisitsApi = {
  async markSeen(personneId: string, visitType = 'visite_terrain', note: string | null = null) {
    const { data, error } = await supabase.rpc('brh_personne_mark_seen', {
      p_personne_id: personneId,
      p_visit_type: visitType,
      p_note: note ?? undefined,
    })
    if (error) throw error
    return data as { ok: boolean; visit_id: string }
  },

  async listVisits(personneId: string): Promise<PersonneVisit[]> {
    const { data, error } = await supabase.rpc('brh_personne_visits_list', {
      p_personne_id: personneId,
    })
    if (error) throw error
    return (data ?? []) as PersonneVisit[]
  },
}

export const brhTravauxApi = {
  async list(personneId: string): Promise<PersonneTravaux[]> {
    const { data, error } = await supabase.rpc('brh_personne_travaux_list', {
      p_personne_id: personneId,
    })
    if (error) throw error
    return (data ?? []) as PersonneTravaux[]
  },

  async upsert(personneId: string, poste: PosteTechnique, patch: TravauxPatch) {
    const { data, error } = await supabase.rpc('brh_personne_travaux_upsert', {
      p_personne_id: personneId,
      p_poste: poste,
      p_patch: patch as unknown as Json,
    })
    if (error) throw error
    return data as { ok: boolean; travaux_id: string }
  },
}

// Libellés français pour l'UI
export const POSTE_LABELS: Record<PosteTechnique, string> = {
  murs: 'Murs (isolation)',
  toiture: 'Toiture / Combles',
  plancher_bas: 'Plancher bas',
  fenetres: 'Fenêtres / Menuiseries',
  chauffage: 'Chauffage',
  ventilation: 'Ventilation',
  eau_chaude: 'Eau chaude sanitaire',
  tableau_electrique: 'Tableau électrique',
  autre: 'Autre',
}

export const ETAT_LABELS: Record<EtatTravaux, { label: string; cls: string }> = {
  non_realise: { label: 'Non réalisé', cls: 'bg-red-50 text-red-800 border-red-200' },
  passoire: { label: 'Passoire', cls: 'bg-red-100 text-red-900 border-red-300' },
  partiel: { label: 'Partiel', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  realise_recent: { label: 'Réalisé récent', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  realise_ancien: { label: 'Réalisé ancien', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  inconnu: { label: 'Inconnu', cls: 'bg-stone-50 text-stone-600 border-stone-200' },
}

export const VISIT_TYPE_LABELS: Record<string, string> = {
  visite_terrain: 'Visite terrain',
  appel: 'Appel',
  email: 'Email',
  rdv_planifie: 'RDV planifié',
  autre: 'Autre',
}
