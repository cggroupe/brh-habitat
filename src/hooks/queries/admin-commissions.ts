/**
 * Hooks React Query — admin-commissions (Phase 13.6.7).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminCommissionsApi, type CommissionInvoiceRow } from '@/api/admin-commissions'

export const ADMIN_COMMISSIONS_KEY = ['admin-commissions'] as const

export function useCommissionInvoicesForPeriod(year: number, month: number) {
  return useQuery({
    queryKey: [...ADMIN_COMMISSIONS_KEY, 'period', year, month] as const,
    queryFn: () => adminCommissionsApi.listForPeriod(year, month),
    staleTime: 30_000,
  })
}

export function useGenerateInvoices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { year: number; month: number; defaultPct?: number }) =>
      adminCommissionsApi.generateInvoices(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COMMISSIONS_KEY })
    },
  })
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { invoiceId: string; stripePaymentIntent?: string }) =>
      adminCommissionsApi.markPaid(input.invoiceId, input.stripePaymentIntent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COMMISSIONS_KEY })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      patch,
    }: {
      invoiceId: string
      patch: Partial<Pick<CommissionInvoiceRow, 'status' | 'notes' | 'invoiced_at'>>
    }) => adminCommissionsApi.updateStatus(invoiceId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COMMISSIONS_KEY })
    },
  })
}
