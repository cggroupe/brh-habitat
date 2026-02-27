import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://lygmmvxnmvlgynmrcpny.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Z21tdnhubXZsZ3lubXJjcG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTQyMTAsImV4cCI6MjA4Nzc5MDIxMH0.EY5XB4Ii8B8NuHFTiChStECdH8VPmojxt8Eoff-inE4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
