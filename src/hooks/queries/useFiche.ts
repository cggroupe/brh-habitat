/**
 * Hooks tanstack query pour les fiches drill-down BRH.
 */
import { useQuery } from '@tanstack/react-query'
import { brhFichesApi } from '@/api/brh-fiches'

export function useFicheAdresse(dpeId: number | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'fiche', 'adresse', dpeId],
    queryFn: () => brhFichesApi.getFicheAdresse(dpeId as number),
    enabled: dpeId != null && Number.isFinite(dpeId),
    staleTime: 60_000,
  })
}

export function useFicheEntreprise(siren: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'fiche', 'entreprise', siren],
    queryFn: () => brhFichesApi.getFicheEntreprise(siren as string),
    enabled: !!siren && siren.length === 9,
    staleTime: 60_000,
  })
}

export function useFichePersonneByName(fullName: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'fiche', 'personne-by-name', fullName],
    queryFn: () => brhFichesApi.getFichePersonneByName(fullName as string),
    enabled: !!fullName && fullName.trim().length > 1,
    staleTime: 60_000,
  })
}
