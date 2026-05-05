import { useQuery } from '@tanstack/react-query'
import { enrichmentApi, type ProspectEnrichment } from '@/api/enrichment'

export const ENRICHMENT_KEY = ['prospect-enrichment'] as const

export function useProspectEnrichment(input: {
  irisCode: string | null
  codePostal: string | null
  lat: number | null
  lng: number | null
  departement: string | null
  gestesPrioritaires: string[]
}) {
  return useQuery<ProspectEnrichment>({
    queryKey: [...ENRICHMENT_KEY, input.irisCode, input.codePostal, input.departement, input.gestesPrioritaires.join(',')],
    queryFn: () => enrichmentApi.fetch(input),
    enabled: !!(input.codePostal || input.irisCode || (input.lat && input.lng)),
    staleTime: 10 * 60_000,
  })
}
