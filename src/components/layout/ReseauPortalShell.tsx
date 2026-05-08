/**
 * Phase D 2026-05-08 — Shell wrapper pour /reseau cross-persona.
 *
 * /reseau est ouvert aux agences ET aux pros (Phase D).
 * Plutôt que de forcer AgenceShell (incohérent visuellement pour un Pro),
 * on détecte le portail principal de l'user et on rend le shell adéquat.
 *
 * Priorités :
 *   1. brh_companies (owner_id) → ProShell
 *   2. brh_partner_contracts (agence_immo, status=active) → AgenceShell
 *   3. Fallback → AgenceShell (rétrocompatibilité historique)
 *
 * Les Shells contiennent un <Outlet /> en interne donc la route enfant
 * /reseau/* sera rendue automatiquement.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AgenceShell from './AgenceShell'
import ProShell from './ProShell'

function useUserPrimaryReseauPortal() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['reseau-primary-portal', user?.id ?? 'anon'] as const,
    queryFn: async (): Promise<'pro' | 'agence'> => {
      if (!user?.id) return 'agence'
      // Pro = brh_companies en priorité (Pro a tendance à etre l'usage le plus large
      // et le shell ProShell est plus mature visuellement pour cross-persona).
      const [{ data: company }, { data: agenceContract }] = await Promise.all([
        supabase.from('brh_companies').select('id').eq('owner_id', user.id).maybeSingle(),
        supabase
          .from('brh_partner_contracts')
          .select('id')
          .eq('signer_profile_id', user.id)
          .eq('partner_type', 'agence_immo')
          .eq('status', 'active')
          .maybeSingle(),
      ])
      // Si l'user est agence → on garde AgenceShell (rétrocompat + cohérence avec
      // l'écosystème agence existant en V1 BRH).
      if (agenceContract) return 'agence'
      if (company) return 'pro'
      return 'agence'
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })
}

export default function ReseauPortalShell() {
  const { data: portal, isLoading } = useUserPrimaryReseauPortal()

  // Loading : on rend AgenceShell par défaut (pas de flash de contenu vide).
  if (isLoading || !portal) return <AgenceShell />
  if (portal === 'pro') return <ProShell />
  return <AgenceShell />
}
