/**
 * API audits — CRUD + compute + finalize + generatePdf.
 *
 * Pattern volontaire pair avec hooks/queries/audits.ts.
 * Cf. caprenov-reverse/wiki/08-implementation-brh/hooks-api-pattern.md
 */

import { supabase } from '@/lib/supabase'
import { computeDpe } from '@/lib/dpe-engine'
import type { AuditInputs, DpeResult } from '@/lib/dpe-engine/types'
import type { Database, Json } from '@/types/database-generated'
import {
  auditInputsSchema,
  auditRowSchema,
  dpeResultSchema,
  type AuditRow,
} from './schemas'

type BrhAuditsInsert = Database['public']['Tables']['brh_audits']['Insert']
type BrhAuditsUpdate = Database['public']['Tables']['brh_audits']['Update']

export const auditsApi = {
  /**
   * Liste des audits visibles par l'utilisateur connecté (RLS Supabase filtre).
   */
  async list(): Promise<AuditRow[]> {
    const { data, error } = await supabase
      .from('brh_audits')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return auditRowSchema.array().parse(data)
  },

  /**
   * Audit unique avec ses variantes et factures.
   */
  async get(id: string): Promise<AuditRow> {
    const { data, error } = await supabase
      .from('brh_audits')
      .select('*, brh_audit_variantes(*), brh_audit_factures(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return auditRowSchema.parse(data)
  },

  /**
   * Créer un audit (mode draft, pro_user_id = user connecté).
   */
  async create(inputs: AuditInputs): Promise<AuditRow> {
    auditInputsSchema.parse(inputs) // validation côté client

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    if (!userData.user) throw new Error('Non authentifié')

    const insertRow: BrhAuditsInsert = {
      inputs: inputs as unknown as Json,
      results: {},
      pro_user_id: userData.user.id,
      status: 'draft',
    }
    const { data, error } = await supabase
      .from('brh_audits')
      .insert(insertRow)
      .select()
      .single()
    if (error) throw error
    return auditRowSchema.parse(data)
  },

  /**
   * Créer un audit côté PARTICULIER (user_id = auth.uid(), pro_user_id NULL).
   * Permet de sauvegarder l'audit complet anonyme dans son compte après login.
   * Cf migration 20260713200000_brh_audits_user_insert.sql
   */
  async createForUser(inputs: AuditInputs, results?: Record<string, unknown>): Promise<AuditRow> {
    auditInputsSchema.parse(inputs)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    if (!userData.user) throw new Error('Non authentifié')

    const insertRow: BrhAuditsInsert = {
      inputs: inputs as unknown as Json,
      results: (results ?? {}) as unknown as Json,
      user_id: userData.user.id,
      pro_user_id: null,
      status: 'submitted',
    }
    const { data, error } = await supabase
      .from('brh_audits')
      .insert(insertRow)
      .select()
      .single()
    if (error) throw error
    return auditRowSchema.parse(data)
  },

  /**
   * Mise à jour partielle d'un audit (uniquement si status=draft via RLS).
   */
  async update(id: string, partial: Partial<AuditRow>): Promise<AuditRow> {
    const updateRow = partial as unknown as BrhAuditsUpdate
    const { data, error } = await supabase
      .from('brh_audits')
      .update(updateRow)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return auditRowSchema.parse(data)
  },

  /**
   * Recalcule le DPE et persiste les résultats.
   *
   * V1 : le calcul se fait CÔTÉ FRONT (moteur TS bundlé, ~50ms).
   * Phase 4+ : passer en EF compute-dpe pour rate limit + audit log.
   */
  async compute(id: string): Promise<DpeResult> {
    const audit = await auditsApi.get(id)

    // Validation des inputs avant calcul
    const inputs = auditInputsSchema.parse(audit.inputs) as AuditInputs
    const result = computeDpe(inputs)

    // Persiste les champs principaux + JSON results
    await auditsApi.update(id, {
      results: result as unknown as Record<string, unknown>,
      cep_kwh_ep_m2_an: result.cepKwhEpM2An,
      ges_kg_co2_m2_an: result.gesKgCo2M2An,
      etiquette_energie: result.etiquetteEnergie,
      etiquette_climat: result.etiquetteClimat,
    })

    return dpeResultSchema.parse(result) as DpeResult
  },

  /**
   * Finalise un audit (status: draft → submitted, lock édition).
   */
  async finalize(id: string): Promise<AuditRow> {
    return auditsApi.update(id, {
      status: 'submitted',
      finalized_at: new Date().toISOString(),
    })
  },

  /**
   * Suppression (admin ou pro propriétaire en draft uniquement).
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('brh_audits').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Upload du PDF d'audit dans Supabase Storage (bucket 'audits').
   * Path : `{audit_id}/audit.pdf`. Persiste pdf_url dans brh_audits.
   *
   * V1 : le PDF est généré côté front via @react-pdf/renderer puis uploadé.
   * Phase 4.2+ : EF render-audit-pdf si on veut le faire côté serveur.
   */
  async uploadPdf(id: string, blob: Blob): Promise<{ path: string; signedUrl: string }> {
    const path = `${id}/audit.pdf`
    const { error: upErr } = await supabase.storage
      .from('audits')
      .upload(path, blob, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (upErr) throw upErr

    // Persiste pdf_url dans la row audit (URL signée 1 an pour conserver le lien valide)
    const { data: signed, error: signErr } = await supabase.storage
      .from('audits')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    if (signErr) throw signErr

    await auditsApi.update(id, { pdf_url: signed.signedUrl })
    return { path, signedUrl: signed.signedUrl }
  },

  /**
   * Génère une URL signée fraîche pour le PDF (TTL 1h).
   */
  async getSignedPdfUrl(id: string): Promise<string | null> {
    const path = `${id}/audit.pdf`
    const { data, error } = await supabase.storage
      .from('audits')
      .createSignedUrl(path, 3600)
    if (error) return null
    return data.signedUrl
  },

  /**
   * Envoi du PDF par email au client via EF send-audit-email.
   */
  async sendByEmail(params: {
    auditId: string
    recipientEmail: string
    message?: string
  }): Promise<{ ok: boolean; resendId?: string }> {
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; resendId?: string }>(
      'send-audit-email',
      { body: params },
    )
    if (error) throw error
    if (!data) throw new Error('Réponse vide de send-audit-email')
    return data
  },
}
