import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database-generated'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}

// Client Supabase typé avec Database auto-généré depuis Supabase (B01 résolu 2026-05-24 Phase B4 complet).
// Régénérer après changement schema : `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database-generated.ts`
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions })

// Alias rétrocompat — supabaseTyped existait pendant la migration progressive.
// À supprimer dans un sweep ultérieur (remplacer imports par `supabase`).
export const supabaseTyped = supabase
