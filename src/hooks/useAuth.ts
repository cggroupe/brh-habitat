import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import type { UserRole } from '@/types/database'

interface ProfileData {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
}

export function useAuth() {
  const { user, setUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchProfile(userId: string): Promise<ProfileData | null> {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('id', userId)
          .single()

        if (fetchError || !data) {
          if (import.meta.env.DEV) {
            console.error('[useAuth] fetchProfile error:', fetchError)
          }
          return null
        }
        return data as ProfileData
      } catch (err) {
        // Ne pas logger les AbortError (cleanup normal)
        if (err instanceof Error && err.name !== 'AbortError') {
          if (import.meta.env.DEV) {
            console.error('[useAuth] fetchProfile unexpected error:', err)
          }
        }
        return null
      }
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

    async function initAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          if (import.meta.env.DEV) {
            console.error('[useAuth] getSession error:', sessionError)
          }
          if (mounted) setError(sessionError.message)
        } else if (session?.user && mounted) {
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            setUser(profile ? profileToUser(profile) : null)
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[useAuth] initAuth unexpected error:', err)
        }
        if (mounted) setError('Erreur lors de l\'initialisation de la session')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        try {
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null)
            setError(null)
            return
          }

          if (session.user) {
            setLoading(true)
            const profile = await fetchProfile(session.user.id)
            if (mounted) {
              setUser(profile ? profileToUser(profile) : null)
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[useAuth] onAuthStateChange error:', err)
          }
          if (mounted) {
            setError('Erreur lors de la mise a jour de la session')
          }
        } finally {
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      abortController.abort()
      subscription.unsubscribe()
    }
  }, [setUser])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
