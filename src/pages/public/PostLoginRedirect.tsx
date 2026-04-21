/**
 * Route de redirection post-login intelligente.
 *
 * Apres un SignIn Clerk, l'user arrive ici. On attend que le bridge hydrate le
 * store (user + role), puis on redirige vers le bon portail :
 *   - admin      -> /admin
 *   - pro        -> /pro
 *   - particulier -> /particulier
 *   - user (autre)-> /tableau-de-bord
 *
 * Timeout securite : si le bridge ne termine pas en 15s, on fallback sur
 * /tableau-de-bord (route la plus permissive) pour eviter une page blanche.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useAppStore } from '@/stores/appStore'

const ROLE_PORTAL: Record<string, string> = {
  admin: '/admin',
  pro: '/pro',
  particulier: '/particulier',
  user: '/tableau-de-bord',
}

export default function PostLoginRedirect() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/connexion', { replace: true })
      return
    }
    if (user) {
      const target = ROLE_PORTAL[user.role] ?? '/tableau-de-bord'
      navigate(target, { replace: true })
      return
    }
    // Fallback si le bridge ne finit pas dans 15s
    const timer = setTimeout(() => {
      if (!useAppStore.getState().user) {
        navigate('/tableau-de-bord', { replace: true })
      }
    }, 15_000)
    return () => clearTimeout(timer)
  }, [isLoaded, isSignedIn, user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary font-body text-sm">Acces a votre espace...</p>
      </div>
    </div>
  )
}
