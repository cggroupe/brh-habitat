/**
 * Phase 18.4 — Guard portail réseau social `/reseau`.
 *
 * Vérifie que l'utilisateur authentifié peut accéder au réseau pro :
 *   - signataire d'une charte `brh_partner_contracts` ACTIVE (agences, artisans RGE…)
 *   - OU propriétaire d'une `brh_companies` (Phase D 2026-05-08 — ouverture aux pros)
 *
 * Si aucun des deux → redirect /tableau-de-bord. Particuliers : pas d'accès en V1
 * (en attente d'un marqueur "affilié actif" en DB).
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ReseauGuard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-reseau-access', user?.id ?? 'anon'] as const,
    queryFn: async () => {
      if (!user?.id) return null
      const [{ data: contract }, { data: company }] = await Promise.all([
        supabase
          .from('brh_partner_contracts')
          .select('id, partner_type, status')
          .eq('signer_profile_id', user.id)
          .eq('status', 'active')
          .order('signed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('brh_companies')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle(),
      ])
      // Renvoie le contract en priorité (pour traçabilité partner_type), sinon company.
      return contract ?? (company ? { id: company.id, partner_type: 'pro_company', status: 'active' } : null)
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
