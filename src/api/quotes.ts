import { supabase } from '@/lib/supabase'
import type { BrhQuoteRow, CommissionStatus } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'

export interface QuoteInsert {
  prospect_id: string
  amount: number
  signed_at: string
  payment_method?: string | null
  commission_rate_percent?: number | null
  notes?: string | null
  created_by?: string | null
}

export type QuoteUpdate = Partial<Omit<BrhQuoteRow, 'id' | 'created_at' | 'updated_at'>>

export interface PaginatedQuotes {
  data: BrhQuoteRow[]
  count: number
  page: number
}

export async function fetchAllQuotes(page: number, commissionStatus?: CommissionStatus): Promise<PaginatedQuotes> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_quotes')
    .select('*', { count: 'exact' })
    .order('signed_at', { ascending: false })
    .range(from, to)

  if (commissionStatus) {
    query = query.eq('commission_status', commissionStatus)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, page }
}

export async function createQuote(payload: QuoteInsert): Promise<BrhQuoteRow> {
  const { data, error } = await supabase
    .from('brh_quotes')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuoteCommissionStatus(
  id: string,
  status: CommissionStatus,
  paidAt?: string | null,
): Promise<BrhQuoteRow> {
  const payload: QuoteUpdate = { commission_status: status }
  if (paidAt !== undefined) payload.commission_paid_at = paidAt

  const { data, error } = await supabase
    .from('brh_quotes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
