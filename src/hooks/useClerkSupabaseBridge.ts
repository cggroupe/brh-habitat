/**
 * Bridge Clerk <-> Supabase.
 *
 * Principe :
 *  1. Clerk gere le login/signup (UI + session)
 *  2. Le webhook clerk-webhook cote backend cree/maj le user auth.users + profile
 *  3. Ce hook cote frontend :
 *     - detecte la session Clerk
 *     - recupere le Supabase UUID via clerk_user_id en DB (public query)
 *     - charge le profile complet depuis profiles (public SELECT sur own row si RLS permet
 *       sinon via une Edge Function bridge-signin avec service_role)
 *     - injecte le user dans le Zustand store (useAppStore)
 *
 * Pour les requetes Supabase protegees par RLS, on utilise un Session temporaire :
 *  - POST /functions/v1/bridge-signin avec le Clerk JWT
 *  - L'Edge Function valide le JWT Clerk + renvoie un Supabase session token
 *  - Ce token est set via supabase.auth.setSession()
 */

import { useEffect, useRef } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { logError } from '@/lib/error'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function useClerkSupabaseBridge() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { getToken, signOut: clerkSignOut } = useClerkAuth()
  const setUser = useAppStore((s) => s.setUser)
  const bridgedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !clerkUser) {
      if (bridgedRef.current) {
        // User vient de se deconnecter
        void supabase.auth.signOut()
        setUser(null)
        bridgedRef.current = null
      }
      return
    }

    // Skip si deja bridged pour ce user
    if (bridgedRef.current === clerkUser.id) return

    async function bridge(): Promise<void> {
      try {
        // 1. Recuperer un JWT Clerk avec le template "supabase" (configure dans Clerk Dashboard)
        const token = await getToken({ template: 'supabase' }).catch(() => null)
        if (!token) {
          logError('bridge', new Error('Impossible d\'obtenir un JWT Clerk template=supabase'))
          return
        }

        // 2. Echanger ce JWT contre une session Supabase via Edge Function bridge-signin
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/bridge-signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) {
          const body = await resp.text().catch(() => '')
          logError('bridge', new Error(`bridge-signin HTTP ${resp.status}: ${body.slice(0, 200)}`))
          return
        }
        const { access_token, refresh_token } = await resp.json() as {
          access_token: string; refresh_token: string
        }

        // 3. Set la session Supabase cote client (injecte le token dans les futures requetes)
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error || !data.user) {
          logError('bridge', error ?? new Error('setSession failed'))
          return
        }

        // 4. Charger le profil pour le Zustand store
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name ?? '',
            role: profile.role,
            avatar_url: profile.avatar_url ?? undefined,
          })
          bridgedRef.current = clerkUser!.id
        }
      } catch (err) {
        logError('bridge:unexpected', err)
      }
    }

    void bridge()
  }, [isLoaded, isSignedIn, clerkUser?.id, setUser, getToken])

  return { signOut: clerkSignOut }
}
