/**
 * useAuth - gestion session Supabase Auth pure (retour post-Clerk).
 *
 * Source de verite : supabase.auth.getSession() + onAuthStateChange.
 * Le role est recupere depuis profiles.role (trigger handle_new_user le remplit
 * automatiquement au signup a partir du user_metadata).
 */

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { loadBrhEmployeesFromDb, resetBrhEmployeesCache } from '@/lib/brh-employees'
import type { UserRole } from '@/types/database'

interface ProfileData {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
}

function profileToUser(profile: ProfileData) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    avatar_url: profile.avatar_url ?? undefined,
  }
}

async function fetchProfile(userId: string): Promise<ProfileData | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as ProfileData
  } catch {
    return null
  }
}

export function useAuth() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const queryClient = useQueryClient()
  const initRef = useRef(false)
  // 25/05 PM — fix audit Playwright : isInitialized initial à false force le
  // spinner pendant validateSession async. Sans ça, l'hydratation appStore
  // depuis localStorage donne role='user' (fallback car role pas persisté
  // pour anti-XSS), les Guards évaluent isAdmin/isParticulier=false et
  // redirigent vers /tableau-de-bord avant que le vrai role soit chargé.
  // Trade-off : bref spinner au mount, mais évite le cascade redirect bug.
  const [isInitialized, setIsInitialized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function validateSession() {
      if (initRef.current) return
      initRef.current = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (mounted && useAppStore.getState().user) setUser(null)
        } else {
          const profile = await fetchProfile(session.user.id)
          if (mounted && profile) {
            setUser(profileToUser(profile))
            // Hydrate brh_employees cache pour EmployeGuard (sync). Debounce 30s + RLS auto.
            void loadBrhEmployeesFromDb()
          }
          else if (mounted && !profile) setUser(null)
        }
      } catch (err) {
        if (mounted) {
          setAuthError(err instanceof Error ? err.message : 'Auth error')
          if (!useAppStore.getState().user) setUser(null)
        }
      } finally {
        if (mounted) setIsInitialized(true)
      }
    }

    void validateSession()

    // onAuthStateChange gère SIGNED_OUT + SIGNED_IN d'un compte différent
    // (cas magic link entrant alors qu'une session précédente existe).
    // Pour les flux login explicites (LoginPage, RegisterProPage…) le profil
    // est déjà chargé en amont — le SIGNED_IN qui suit ne déclenche aucune
    // action si l'user.id correspond déjà à l'utilisateur courant.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_OUT') {
          setUser(null)
          initRef.current = false
          return
        }
        if (event === 'SIGNED_IN' && session?.user?.id) {
          const currentUserId = useAppStore.getState().user?.id
          // Si la session entrante est le même utilisateur déjà connecté
          // (cas normal post-LoginPage), on ne refait rien — le profil
          // a déjà été chargé par le flux de login explicite.
          if (currentUserId === session.user.id) return
          // Sinon : magic link reçu pour un autre compte (cas portail test
          // ou changement de session via lien). On recharge le profil.
          void fetchProfile(session.user.id).then((profile) => {
            if (!mounted) return
            if (profile) setUser(profileToUser(profile))
            else setUser(null)
          })
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser])

  async function signOut() {
    initRef.current = false
    await supabase.auth.signOut()
    setUser(null)
    queryClient.clear()
    useDiagnosticStore.getState().reset()
    useAppStore.getState().closeDrawer()
    // Purge le cache employés pour éviter qu'un employé "fantôme" reste
    // détecté pour le user suivant qui se logge dans la même tab.
    resetBrhEmployeesCache()
  }

  // 25/05 PM — loading = !isInitialized (pas !user && !isInitialized).
  // Cause : appStore persiste user avec role='user' fallback (anti-XSS),
  // donc user n'est jamais null au mount initial. La logique précédente
  // donnait loading=false → guards évaluaient un faux role → cascade redirects.
  // Fix : loading reste true tant que validateSession async n'a pas chargé le
  // vrai role depuis profiles.
  const loading = !isInitialized

  return {
    user,
    loading,
    error: authError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
