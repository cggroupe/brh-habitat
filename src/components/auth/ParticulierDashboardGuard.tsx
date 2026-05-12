/**
 * ParticulierDashboardGuard — fixes le bug cross-persona observé 12/05/2026.
 *
 * Bug : Claire Pichon (agence immo connectée) arrivait sur `/tableau-de-bord`
 * et voyait le tableau de bord particulier. Cause : la route `/tableau-de-bord`
 * (et les autres routes user authentifié comme /mes-logements, /mes-dossiers,
 * /audit-energetique, etc.) étaient sous AuthGuard simple, qui n'a aucun
 * filtre persona.
 *
 * Fix : ce guard vérifie qu'aucun membership pro (agence / artisan / company)
 * n'est attaché à l'user. Si oui, on redirige automatiquement vers le bon
 * portail. Les admins sont autorisés partout.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface PersonaCheck {
  hasAgence: boolean
  hasArtisan: boolean
  hasCompany: boolean
}

async function detectMemberships(userId: string): Promise<PersonaCheck> {
  const [{ data: artisan }, { data: agence }, { data: company }] = await Promise.all([
    supabase.from('brh_artisans_rge').select('id').eq('profile_id', userId).maybeSingle(),
    supabase
      .from('brh_partner_contracts')
      .select('id')
      .eq('signer_profile_id', userId)
      .eq('partner_type', 'agence_immo')
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('brh_companies').select('id').eq('owner_id', userId).maybeSingle(),
  ])
  return {
    hasAgence: !!agence,
    hasArtisan: !!artisan,
    hasCompany: !!company,
  }
}

export default function ParticulierDashboardGuard() {
  const { user, isAuthenticated, loading } = useAuth()

  const { data: memberships, isLoading: loadingMemberships } = useQuery({
    queryKey: ['persona-check', user?.id],
    queryFn: () => (user?.id ? detectMemberships(user.id) : Promise.resolve(null)),
    enabled: !!user?.id && user?.role !== 'admin',
    staleTime: 5 * 60_000,
  })

  if (loading || (isAuthenticated && user?.role !== 'admin' && loadingMemberships)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/connexion" replace />

  // Admin : accès libre (administre l'app entière, peut voir tous les portails).
  if (user?.role === 'admin') return <Outlet />

  // Membership pro détecté → redirect vers le bon portail (priorité : agence > pro > artisan).
  if (memberships?.hasAgence) return <Navigate to="/agence" replace />
  if (memberships?.hasCompany) return <Navigate to="/pro" replace />
  if (memberships?.hasArtisan) return <Navigate to="/artisan" replace />

  return <Outlet />
}
