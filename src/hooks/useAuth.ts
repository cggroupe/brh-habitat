/**
 * useAuth - hook selecteur du store utilisateur.
 *
 * Depuis la migration Clerk, ce hook NE FAIT PLUS de session management Supabase.
 * La source de verite est Clerk, qui pousse les donnees vers le store Zustand via
 * useClerkSupabaseBridge (monte une fois dans App.tsx).
 *
 * Ce hook est donc un simple selecteur pour les Guards et composants qui veulent
 * lire user / role / isAuthenticated, ainsi qu'un signOut global.
 */

import { useClerk, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { useDiagnosticStore } from '@/stores/diagnosticStore'

export function useAuth() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const queryClient = useQueryClient()
  const clerk = useClerk()
  const { isLoaded: clerkLoaded, isSignedIn } = useUser()

  async function signOut() {
    try { await clerk.signOut() } catch { /* ignore */ }
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    setUser(null)
    queryClient.clear()
    useDiagnosticStore.getState().reset()
    useAppStore.getState().closeDrawer()
  }

  // loading = tant que Clerk n'est pas pret, OU Clerk signed in mais le bridge
  // n'a pas encore hydrate le store (courte fenetre pendant le sync initial)
  const loading = !clerkLoaded || (isSignedIn === true && !user)

  return {
    user,
    loading,
    error: null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
