/**
 * Phase 18.4 — Guard portail réseau social `/reseau`.
 *
 * Vérifie que l'utilisateur authentifié est signataire d'une charte
 * `brh_partner_contracts` ACTIVE (toutes personae : agence_immo, artisan_rge,
 * pro_company, architecte, maitre_oeuvre, apporteur_affaires, courtier, syndic, autre).
 *
 * Si pas le cas → redirect /tableau-de-bord (l'utilisateur reste authentifié
 * mais n'a pas accès au réseau social pro). Onboarding partner ailleurs.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ReseauGuard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-pro-contract', user?.id ?? 'anon'] as const,
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('brh_partner_contracts')
        .select('id, partner_type, status')
        .eq('signer_profile_id', user.id)
        .eq('status', 'active')
        .order('signed_at', { ascending: false })
        .limit(1)
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
