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
// B01 : tentative B4 (Phase dette 2026-05-24) de typer `supabase` avec <Database>
// a révélé 193 erreurs TS dispersées (string|null vs string, overloads). Chaque
// fix demande validation runtime. Reporté en sprint dédié séparé.
// En attendant : `supabaseTyped` utilisable pour les nouvelles tables.
// `database-generated.ts` régénéré le 2026-05-24 depuis prod (10 773 lignes).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions })

// Client typé avec Database auto-généré (Phase 1 DPE Engine).
// À utiliser dans le moteur DPE et les nouvelles APIs (audits, dpe_solutions, etc.).
export const supabaseTyped = createClient<GeneratedDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: authOptions,
})
