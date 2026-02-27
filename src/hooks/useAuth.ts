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

  useEffect(() => {
    let mounted = true

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
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user && mounted) {
        const profile = await fetchProfile(session.user.id)
        if (mounted) {
          setUser(profile ? profileToUser(profile) : null)
        }
      }

      if (mounted) setLoading(false)
    }

    void initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setLoading(false)
          return
        }

        if (session.user) {
          setLoading(true)
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            setUser(profile ? profileToUser(profile) : null)
            setLoading(false)
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
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
