/**
 * Guard specifique a la route /inscription/pro/finalisation.
 *
 * Cette route cree une entreprise (INSERT brh_companies) a partir des donnees SIRET
 * stockees en sessionStorage. Elle doit etre protegee contre les acces directs :
 *  1. Le user doit etre logge sur Clerk (signup vient d'etre fait)
 *  2. Les donnees SIRET doivent etre presentes en sessionStorage (sinon l'user a
 *     accede directement sans passer par l'etape 1)
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const SIRET_SS_KEY = 'brh_pending_siret_data'
const INVITE_SS_KEY = 'brh_pending_invitation_token'

export default function ProSignupGuard() {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/inscription/pro" replace />
  }

  // Doit avoir des donnees SIRET OU un token d'invitation en sessionStorage
  const hasSiretData = typeof window !== 'undefined' && !!sessionStorage.getItem(SIRET_SS_KEY)
  const hasInvitationToken = typeof window !== 'undefined' && !!sessionStorage.getItem(INVITE_SS_KEY)

  if (!hasSiretData && !hasInvitationToken) {
    // L'user est logge mais arrive ici sans contexte — retour au debut
    return <Navigate to="/pro" replace />
  }

  return <Outlet />
}
