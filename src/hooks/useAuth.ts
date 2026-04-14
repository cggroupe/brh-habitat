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
  const { user, setUser } = useAppStore()
  const queryClient = useQueryClient()
  const initRef = useRef(false)
  const [isInitialized, setIsInitialized] = useState(() => !!useAppStore.getState().user)

  useEffect(() => {
    let mounted = true

    async function validateSession() {
      if (initRef.current) return
      initRef.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          if (mounted && useAppStore.getState().user) {
            setUser(null)
          }
        } else {
          const profile = await fetchProfile(session.user.id)
          if (mounted && profile) {
            setUser(profileToUser(profile))
          } else if (mounted && !profile) {
            setUser(null)
          }
        }
      } catch {
        // Erreur reseau : garder le user du cache
      } finally {
        if (mounted) setIsInitialized(true)
      }
    }

    void validateSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          initRef.current = false
          return
        }

        if (session.user) {
          const current = useAppStore.getState().user
          if (!current || current.id !== session.user.id) {
            const profile = await fetchProfile(session.user.id)
            if (mounted && profile) {
              setUser(profileToUser(profile))
            }
          }
        }
      }
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
    // Nettoyer tous les stores persistants et le cache React Query
    queryClient.clear()
    useDiagnosticStore.getState().reset()
    useAppStore.getState().closeDrawer()
  }

  // loading = true seulement si pas de cache ET session pas encore validee
  const loading = !user && !isInitialized

  return {
    user,
    loading,
    error: null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
