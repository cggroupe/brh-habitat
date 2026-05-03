/**
 * API admin-commissions — Phase 13.6.7.
 *
 * Tracking des commissions BRH (5-10% du chantier signé) par artisan/mois.
 * RLS : admin only pour mutations, artisan voit ses propres factures.
 */

import { supabase } from '@/lib/supabase'

export interface CommissionInvoiceRow {
  id: string
  artisan_id: string
  period_year: number
  period_month: number
  nb_leads_completed: number
  total_chantiers_ttc_eur: number
  commission_pct: number
  total_commission_due_eur: number
  status: 'pending' | 'invoiced' | 'paid' | 'reconciled' | 'canceled' | 'disputed'
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  invoiced_at: string | null
  paid_at: string | null
  reconciled_at: string | null
  notes: string | null
  // Phase 13.6.7.2 — PDF + email tracking
  pdf_path: string | null
  pdf_uploaded_at: string | null
  email_sent_at: string | null
  email_resend_id: string | null
  created_at: string
  updated_at: string
}

export interface CommissionInvoiceEnriched extends CommissionInvoiceRow {
  artisan_nom_entreprise?: string | null
  artisan_commune?: string | null
  artisan_email?: string | null
  artisan_departement?: string | null
}

export interface GenerateInvoicesResult {
  artisan_id: string
  invoice_id: string
  nb_leads: number
  total_eur: number
  commission_eur: number
  is_new: boolean
}

export const adminCommissionsApi = {
  /**
   * Liste les factures du mois (avec joint artisan).
   */
  async listForPeriod(year: number, month: number): Promise<CommissionInvoiceEnriched[]> {
    const { data: invoices, error } = await supabase
      .from('brh_commission_invoices')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('total_commission_due_eur', { ascending: false })
    if (error) throw error
    if (!invoices || invoices.length === 0) return []

    const artisanIds = Array.from(new Set(invoices.map((i) => i.artisan_id as string)))
    const { data: artisans } = await supabase
      .from('brh_artisans_rge')
      .select('id,nom_entreprise,commune,email,departement')
      .in('id', artisanIds)

    const aMap = new Map((artisans ?? []).map((a) => [a.id as string, a]))

    return invoices.map((i) => {
      const a = aMap.get(i.artisan_id as string)
      return {
        ...(i as unknown as CommissionInvoiceRow),
        artisan_nom_entreprise: (a?.nom_entreprise as string | null) ?? null,
        artisan_commune: (a?.commune as string | null) ?? null,
        artisan_email: (a?.email as string | null) ?? null,
        artisan_departement: (a?.departement as string | null) ?? null,
      }
    })
  },

  /**
   * Génère les factures pour un mois (idempotent — skip si déjà existante).
   * RPC `brh_generate_commission_invoices`.
   */
  async generateInvoices(input: {
    year: number
    month: number
    defaultPct?: number
  }): Promise<GenerateInvoicesResult[]> {
    const { data, error } = await supabase.rpc('brh_generate_commission_invoices', {
      p_year: input.year,
      p_month: input.month,
      p_default_pct: input.defaultPct ?? 0.05,
    })
    if (error) throw error
    return (data ?? []) as GenerateInvoicesResult[]
  },

  /**
   * Marque une facture comme payée + cascade commission_paid_eur sur leads.
   */
  async markPaid(invoiceId: string, stripePaymentIntent?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('brh_mark_commission_paid', {
      p_invoice_id: invoiceId,
      p_stripe_payment_intent: stripePaymentIntent ?? null,
    })
    if (error) throw error
    return Boolean(data)
  },

  /**
   * Update statut d'une facture (admin uniquement, RLS).
   */
  async updateStatus(
    invoiceId: string,
    patch: Partial<Pick<CommissionInvoiceRow, 'status' | 'notes' | 'invoiced_at'>>,
  ): Promise<CommissionInvoiceRow> {
    const update: Record<string, unknown> = { ...patch }
    if (patch.status === 'invoiced' && !patch.invoiced_at) {
      update.invoiced_at = new Date().toISOString()
    }
    if (patch.status === 'reconciled') {
      update.reconciled_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('brh_commission_invoices')
      .update(update)
      .eq('id', invoiceId)
      .select('*')
      .single()
    if (error) throw error
    return data as unknown as CommissionInvoiceRow
  },

  /**
   * Phase 13.6.7.2 — Upload PDF facture dans Supabase Storage + update invoice.pdf_path.
   * Path conventionnel : `{artisan_id}/{year}/{month}.pdf`.
   */
  async uploadPdf(input: {
    invoice: CommissionInvoiceRow
    blob: Blob
  }): Promise<{ path: string }> {
    const path = `${input.invoice.artisan_id}/${input.invoice.period_year}/${String(input.invoice.period_month).padStart(2, '0')}.pdf`
    const { error: uErr } = await supabase.storage
      .from('brh-commission-invoices')
      .upload(path, input.blob, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (uErr) throw uErr

    const { error: iErr } = await supabase
      .from('brh_commission_invoices')
      .update({ pdf_path: path, pdf_uploaded_at: new Date().toISOString() })
      .eq('id', input.invoice.id)
    if (iErr) throw iErr

    return { path }
  },

  /**
   * Phase 13.6.7.3 — Bulk progress callback type pour envoi en série.
   */
  /**
   * Phase 13.6.7.2 — Envoie la facture à l'artisan par email Resend (signed URL 30j).
   */
  async sendInvoiceByEmail(invoiceId: string): Promise<{
    sent: boolean
    resendId?: string
    signedUrl?: string
    to?: string
  }> {
    const { data, error } = await supabase.functions.invoke<{
      sent: boolean
      resendId?: string
      signedUrl?: string
      to?: string
    }>('send-commission-invoice', { body: { invoiceId } })
    if (error) throw error
    return data ?? { sent: false }
  },

  /**
   * Phase 13.6.7.3.1 — Charge le dernier run du cron auto-génération mensuelle.
   */
  async getLastCronRun(): Promise<{
    id: string
    job_name: string
    started_at: string
    finished_at: string | null
    status: 'running' | 'success' | 'error'
    invoices_created: number | null
    total_commission_eur: number | null
    error_message: string | null
  } | null> {
    const { data, error } = await supabase
      .from('brh_cron_runs')
      .select('*')
      .eq('job_name', 'brh_monthly_commissions')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as {
      id: string
      job_name: string
      started_at: string
      finished_at: string | null
      status: 'running' | 'success' | 'error'
      invoices_created: number | null
      total_commission_eur: number | null
      error_message: string | null
    } | null) ?? null
  },

  /**
   * Charge les leads liés à une facture (audit trail).
   */
  async getLeadsForInvoice(invoiceId: string): Promise<
    Array<{ lead_id: string; chantier_ttc_eur: number; commission_eur: number }>
  > {
    const { data, error } = await supabase
      .from('brh_commission_lead_links')
      .select('lead_id,chantier_ttc_eur,commission_eur')
      .eq('invoice_id', invoiceId)
    if (error) throw error
    return (data ?? []) as unknown as Array<{
      lead_id: string
      chantier_ttc_eur: number
      commission_eur: number
    }>
  },
}
