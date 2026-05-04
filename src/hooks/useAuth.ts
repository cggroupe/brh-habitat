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
  const [isInitialized, setIsInitialized] = useState(() => !!useAppStore.getState().user)
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
          if (mounted && profile) setUser(profileToUser(profile))
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

    // onAuthStateChange ne charge plus le profil — il gère uniquement SIGNED_OUT.
    // Le chargement du profil est la responsabilité des flux de login explicites
    // (LoginPage, RegisterProPage, JoinCompanyPage) conformément à la règle CLAUDE.md.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (!mounted) return
        if (event === 'SIGNED_OUT') {
          setUser(null)
          initRef.current = false
        }
        // Pour tous les autres événements (SIGNED_IN, TOKEN_REFRESHED, etc.),
        // le profil est déjà chargé par le flux de login — rien à faire ici.
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
  }

  const loading = !user && !isInitialized

  return {
    user,
    loading,
    error: authError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
