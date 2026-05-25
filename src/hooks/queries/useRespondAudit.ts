/**
 * useRespondAudit — Mutation React Query pour la page publique /audit/respond.
 *
 * Pas de cache invalidation : page anon, aucun état React Query partagé.
 */
import { useMutation } from '@tanstack/react-query'
import { auditRespondApi, type AuditRespondInput, type AuditRespondOutput } from '@/api/audit-respond'

export function useRespondAudit() {
  return useMutation<AuditRespondOutput, Error, AuditRespondInput>({
    mutationFn: (input) => auditRespondApi.respond(input),
  })
}
