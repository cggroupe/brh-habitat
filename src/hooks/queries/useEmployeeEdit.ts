import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  brhEmployeeEditApi,
  type EmployeeEditPatch,
  type DpePosteOverrideInput,
} from '@/api/brh-employee-edit'

export function useUpdatePersonne(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: EmployeeEditPatch) => brhEmployeeEditApi.updatePersonne(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'personne-360', id] })
      qc.invalidateQueries({ queryKey: ['brh', 'clients-historique'] })
    },
  })
}

export function useUpdateDpe(dpeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: EmployeeEditPatch) => brhEmployeeEditApi.updateDpe(dpeId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'fiche-adresse', dpeId] })
      qc.invalidateQueries({ queryKey: ['brh', 'clients-historique'] })
    },
  })
}

export function useUpdateDpeOverrides(dpeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overrides: Record<string, DpePosteOverrideInput>) =>
      brhEmployeeEditApi.updateDpeOverrides(dpeId, overrides),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brh', 'fiche-adresse', dpeId] })
      qc.invalidateQueries({ queryKey: ['brh', 'personne-360'] })
    },
  })
}
