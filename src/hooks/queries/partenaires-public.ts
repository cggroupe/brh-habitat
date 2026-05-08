/**
 * Hooks React Query — annuaire public partenaires BRH.
 */
import { useQuery } from '@tanstack/react-query'
import { partenairesPublicApi, type CompanyProfession } from '@/api/partenaires-public'

export const PARTENAIRES_PUBLIC_KEY = ['partenaires-public'] as const

export function usePublicPartenaires(filters?: { departement?: string; profession?: CompanyProfession; limit?: number }) {
  return useQuery({
    queryKey: [...PARTENAIRES_PUBLIC_KEY, filters ?? {}] as const,
    queryFn: () => partenairesPublicApi.list(filters),
    staleTime: 5 * 60_000, // 5 min — annuaire public peu mouvant
  })
}
