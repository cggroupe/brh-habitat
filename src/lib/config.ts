/**
 * Variables d'environnement centralisees.
 * SOURCE UNIQUE pour VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
 * Tout module qui a besoin de ces valeurs DOIT importer depuis ce fichier.
 */

// Compat Vite (browser) + Node (scripts/tests). Vite expose `import.meta.env`,
// Node n'en dispose pas → fallback sur globalThis.process.env (avec préfixe VITE_).
const proc = (globalThis as { process?: { env?: Record<string, string | undefined>; versions?: { node?: string } } }).process
const env: Record<string, string | undefined> =
  ((import.meta as { env?: Record<string, string | undefined> }).env ?? proc?.env) ?? {}

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '') as string
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? '') as string

// En production browser, on lance une erreur si les vars sont manquantes.
// En Node (scripts/tests), on autorise les valeurs vides (les modules qui
// font réellement des requêtes Supabase doivent valider eux-mêmes).
const isNode = !!proc?.versions?.node
if (!isNode && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
  )
}

/** Construit l'URL d'une Edge Function : edgeFunctionUrl('company-invite') */
export function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`
}
