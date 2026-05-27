/**
 * API client pour l'EF `dirigeant-psy-profile`.
 *
 * Sprint 1.7 (27/05) — Génère un profil psycho-commercial structuré pour un
 * dirigeant identifié par (nom, prenom). L'EF persiste dans
 * brh_dirigeants.psy_profile et retourne le profil parsé.
 */
import { supabase } from '@/lib/supabase'

export interface PsyProfile {
  version: string
  generated_at: string
  model: string
  summary: string
  motivations: string[]
  pain_points: string[]
  best_approach: string
  red_flags: string[]
}

export interface GeneratePsyProfileResult {
  profile: PsyProfile
  generated_at: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
  duration_ms: number
}

export async function generateDirigeantPsyProfile(args: {
  nom: string
  prenom?: string
}): Promise<GeneratePsyProfileResult> {
  const { data, error } = await supabase.functions.invoke<GeneratePsyProfileResult>(
    'dirigeant-psy-profile',
    { body: { nom: args.nom, prenom: args.prenom ?? '' } },
  )
  if (error) throw error
  if (!data) throw new Error('Empty response from dirigeant-psy-profile')
  return data
}
