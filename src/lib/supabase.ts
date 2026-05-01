import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

// Note: client non-type avec <Database> car le format Database manuel n'est pas
// reconnu par supabase-js (.insert/.update voient 'never'). A activer apres
// generation via `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database.ts`.
// Les Row interfaces de src/types/database.ts restent utilisees explicitement dans api/*.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
