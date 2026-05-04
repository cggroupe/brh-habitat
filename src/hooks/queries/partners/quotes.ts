import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchAllQuotes,
  createQuote,
  updateQuoteCommissionStatus,
} from '@/api/quotes'
import type { QuoteInsert } from '@/api/quotes'
import type { CommissionStatus } from '@/types/partner'

// ===========================================================================
// QUOTES
// ===========================================================================

export function useAdminQuotes(page: number, commissionStatus?: CommissionStatus) {
  return useQuery({
    queryKey: ['quotes', 'admin', page, commissionStatus],
    staleTime: 2 * 60_000,
    queryFn: () => fetchAllQuotes(page, commissionStatus),
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuoteInsert) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['points'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useCreateQuote', err),
  })
}

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, paidAt }: { id: string; status: CommissionStatus; paidAt?: string | null }) =>
      updateQuoteCommissionStatus(id, status, paidAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useUpdateCommissionStatus', err),
  })
}
