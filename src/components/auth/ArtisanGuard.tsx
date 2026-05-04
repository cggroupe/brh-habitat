/**
 * Phase R4 — Guard portail artisan.
 *
 * Vérifie que l'utilisateur authentifié est lié à une fiche `brh_artisans_rge`
 * via le champ `profile_id`. Si pas le cas → redirect vers /tableau-de-bord
 * (l'utilisateur reste authentifié mais n'a pas accès au portail artisan).
 *
 * Le lien profile_id ↔ artisan est posé Phase 13.6.4 (auto par magic link
 * onboarding) ou manuellement par l'admin.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ArtisanGuard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-artisan-profile', user?.id ?? 'anon'] as const,
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('brh_artisans_rge')
        .select('id, nom_entreprise')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })

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
