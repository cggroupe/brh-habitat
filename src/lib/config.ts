/**
 * Variables d'environnement centralisees.
 * SOURCE UNIQUE pour VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
 * Tout module qui a besoin de ces valeurs DOIT importer depuis ce fichier.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
  )
}

/** Construit l'URL d'une Edge Function : edgeFunctionUrl('company-invite') */
export function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`
}
