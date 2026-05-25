/**
 * Phase R1 — Hook React Query : ma membership pro courante.
 *
 * Charge le lien brh_company_members de l'utilisateur authentifié pour résoudre
 * son rôle (owner / member) + permissions JSONB.
 *
 * Renvoie null si l'utilisateur n'a pas de membership pro (admin, particulier,
 * pro orphelin sans company).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { MemberRole } from '@/types/database'
import type { MemberPermissions } from '@/types/permissions'

export interface MyMembership {
  companyId: string
  memberRole: MemberRole
  permissions: MemberPermissions
  joinedAt: string
}

export const MEMBERSHIP_KEY = ['my-membership'] as const

export function useMyMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...MEMBERSHIP_KEY, user?.id ?? 'anon'] as const,
    queryFn: async (): Promise<MyMembership | null> => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('brh_company_members')
        .select('company_id, member_role, permissions, joined_at')
        .eq('profile_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data || !data.company_id) return null
      return {
        companyId: data.company_id,
        memberRole: (data.member_role ?? 'member') as MemberRole,
        permissions: (data.permissions ?? {}) as MemberPermissions,
        joinedAt: data.joined_at ?? new Date().toISOString(),
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })
}
