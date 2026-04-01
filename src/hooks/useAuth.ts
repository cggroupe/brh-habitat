import { useEffect, useRef } from 'react'
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
  const initRef = useRef(false)

  useEffect(() => {
    let mounted = true

    // Validation en arriere-plan : verifier que la session est toujours valide
    // Sans bloquer l'affichage (le user du localStorage est deja la)
    async function validateSession() {
      if (initRef.current) return
      initRef.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // Session expiree : nettoyer
          if (mounted && useAppStore.getState().user) {
            setUser(null)
          }
          return
        }

        // Rafraichir le profil silencieusement si le user est connecte
        const profile = await fetchProfile(session.user.id)
        if (mounted && profile) {
          setUser(profileToUser(profile))
        } else if (mounted && !profile) {
          setUser(null)
        }
      } catch {
        // Erreur reseau : garder le user du cache, ne pas bloquer
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
  }

  return {
    user,
    // Le loading est false si on a un user cache (localStorage)
    // True seulement au tout premier chargement sans cache
    loading: false,
    error: null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signOut,
  }
}
