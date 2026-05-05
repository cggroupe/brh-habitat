import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agenceSimulationsApi,
  type SimulationInsert,
} from '@/api/agence-simulations'

export const SIMS_KEY = ['agence-simulations'] as const

export function useMySimulations(agenceId: string | undefined) {
  return useQuery({
    queryKey: [...SIMS_KEY, 'list', agenceId] as const,
    queryFn: () => agenceSimulationsApi.list(agenceId!),
    enabled: !!agenceId,
    staleTime: 60_000,
  })
}

export function useSimulationsForLead(leadAssignmentId: string | undefined) {
  return useQuery({
    queryKey: [...SIMS_KEY, 'lead', leadAssignmentId] as const,
    queryFn: () => agenceSimulationsApi.listForLead(leadAssignmentId!),
    enabled: !!leadAssignmentId,
    staleTime: 60_000,
  })
}

export function useSimulation(id: string | undefined) {
  return useQuery({
    queryKey: [...SIMS_KEY, 'one', id] as const,
    queryFn: () => agenceSimulationsApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useCreateSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SimulationInsert) => agenceSimulationsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SIMS_KEY }),
  })
}

export function useDeleteSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => agenceSimulationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SIMS_KEY }),
  })
}
