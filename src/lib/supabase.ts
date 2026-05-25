import { createClient, processLock } from '@supabase/supabase-js'
import type { Database } from '@/types/database-generated'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  // 25/05 PM — fix audit Playwright : remplace navigatorLock (défaut) par
  // processLock pour éviter le bug "Lock broken by another request with the
  // 'steal' option." qui rendait le portail /agence inutilisable (22/22 routes
  // crash en dev ET en prod Vercel). navigatorLock (Web Locks API) sature
  // quand l'app fait beaucoup de queries auth concurrentes (sidebar + 8
  // hooks agence-* + notifications + leads count). processLock est un lock
  // in-process simple, suffisant pour usage single-tab business.
  lock: processLock,
}

// Client Supabase typé avec Database auto-généré depuis Supabase (B01 résolu 2026-05-24 Phase B4 complet).
// Régénérer après changement schema : `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database-generated.ts`
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions })

// Alias rétrocompat — supabaseTyped existait pendant la migration progressive.
// À supprimer dans un sweep ultérieur (remplacer imports par `supabase`).
export const supabaseTyped = supabase
