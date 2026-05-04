/**
 * Phase 16.0.6 — Guard portail agence immobilière.
 *
 * Logique d'accès (proxy via charte signée, pas de UserRole='agence' en DB) :
 *   1. Utilisateur authentifié
 *   2. Existe un brh_partner_contracts avec :
 *        signer_profile_id = auth.uid()
 *        partner_type = 'agence_immo'
 *        status = 'active'
 *   3. La charte est signée + email confirmé
 *
 * Sinon → redirect /tableau-de-bord (ou /inscription/agence pour onboarding).
 *
 * Cohérent avec ArtisanGuard (Phase R4) qui suit le même pattern via
 * brh_artisans_rge.profile_id.
 *
 * Hook réutilisable : `useMyAgenceMembership` dans hooks/queries/agence-membership.ts
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'

export default function AgenceGuard() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { data, isLoading } = useMyAgenceMembership()

  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/connexion" replace />
  if (!data) return <Navigate to="/tableau-de-bord" replace />

  return <Outlet />
}
