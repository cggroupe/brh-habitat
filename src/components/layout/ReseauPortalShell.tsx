/**
 * Phase D 2026-05-08 — Shell wrapper pour /reseau cross-persona.
 * Update 2026-05-18 — Ajoute EmployeShell pour les BRH internes (admin/pro/employe).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AgenceShell from './AgenceShell'
import ProShell from './ProShell'
import EmployeShell from './EmployeShell'

type Portal = 'employe' | 'pro' | 'agence'

function useUserPrimaryReseauPortal() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['reseau-primary-portal', user?.id ?? 'anon'] as const,
    queryFn: async (): Promise<Portal> => {
      if (!user?.id) return 'agence'
      const [{ data: profile }, { data: company }, { data: agenceContract }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('brh_companies').select('id').eq('owner_id', user.id).maybeSingle(),
        supabase
          .from('brh_partner_contracts')
          .select('id')
          .eq('signer_profile_id', user.id)
          .eq('partner_type', 'agence_immo')
          .eq('status', 'active')
          .maybeSingle(),
      ])
      // BRH internes (admin/pro/employe) gardent leur cockpit employé.
      if (profile?.role && ['admin', 'pro', 'employe'].includes(profile.role)) {
        return 'employe'
      }
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

  if (isLoading || !portal) return <AgenceShell />
  if (portal === 'employe') return <EmployeShell />
  if (portal === 'pro') return <ProShell />
  return <AgenceShell />
}
