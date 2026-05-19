/**
 * brh-employee-edit — mutations employé sur fiches BRH (clients + DPE).
 *
 * 2 RPC SECURITY DEFINER avec whitelist stricte des champs + audit log.
 */
import { supabase } from '@/lib/supabase'

export interface EmployeeEditPatch {
  telephone?: string | null
  email?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  employee_notes?: string | null
  travaux_terrain_status?: 'aucun' | 'partiel' | 'total' | 'inconnu' | null
  dpe_terrain_estime?: string | null
  interet_brh?: 'chaud' | 'tiede' | 'froid' | 'a_recontacter' | 'refus' | 'inconnu' | null
  contact_disponibilite?: 'matin' | 'apres_midi' | 'soir' | 'weekend' | 'inconnu' | null
  derniere_visite_terrain?: string | null
}

export const brhEmployeeEditApi = {
  async updatePersonne(id: string, patch: EmployeeEditPatch): Promise<{ ok: boolean; changes: number }> {
    const { data, error } = await supabase.rpc('brh_personne_update_employee', {
      p_id: id,
      p_patch: patch,
    })
    if (error) throw error
    return data as { ok: boolean; changes: number }
  },

  async updateDpe(dpeId: number, patch: EmployeeEditPatch): Promise<{ ok: boolean; changes: number }> {
    const { data, error } = await supabase.rpc('brh_dpe_update_employee', {
      p_dpe_id: dpeId,
      p_patch: patch,
    })
    if (error) throw error
    return data as { ok: boolean; changes: number }
  },
}
