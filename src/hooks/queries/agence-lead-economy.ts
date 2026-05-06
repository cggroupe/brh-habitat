/**
 * Phase 16.1 Step A — Hooks React Query pour l'économie de leads agence.
 *
 * `useMyLeadBreakdown` fetch le breakdown unifié (1 RPC central).
 * Utilisé par AgenceDashboard, AgenceLeads, AgenceProgression pour afficher
 * la décomposition tier + 3 sources de bonus.
 */
import { useQuery } from '@tanstack/react-query'
import { agenceLeadEconomyApi } from '@/api/agence-lead-economy'

export const LEAD_ECONOMY_KEY = ['agence-lead-economy'] as const

export function useMyLeadBreakdown() {
  return useQuery({
    queryKey: [...LEAD_ECONOMY_KEY, 'breakdown'] as const,
    queryFn: () => agenceLeadEconomyApi.getMyBreakdown(),
    staleTime: 30_000,
  })
}
