import { createClient } from '@supabase/supabase-js'
import type { Database as GeneratedDatabase } from '@/types/database-generated'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}

// Client non typé (rétrocompatible avec le code existant qui utilise les Row
// interfaces manuelles de src/types/database.ts).
// B01 partiellement résolu : les types officiels sont disponibles dans
// src/types/database-generated.ts et utilisables via `supabaseTyped`
// pour les nouvelles tables (notamment brh_dpe_*, brh_audits).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions })

// Client typé avec Database auto-généré (Phase 1 DPE Engine).
// À utiliser dans le moteur DPE et les nouvelles APIs (audits, dpe_solutions, etc.).
// Migration progressive : à terme, remplacer `supabase` par `supabaseTyped` partout.
export const supabaseTyped = createClient<GeneratedDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: authOptions,
})
