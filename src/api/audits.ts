/**
 * API audits — CRUD + compute + finalize + generatePdf.
 *
 * Pattern volontaire pair avec hooks/queries/audits.ts.
 * Cf. caprenov-reverse/wiki/08-implementation-brh/hooks-api-pattern.md
 */

import { supabase } from '@/lib/supabase'
import { computeDpe } from '@/lib/dpe-engine'
import type { AuditInputs, DpeResult } from '@/lib/dpe-engine/types'
import {
  auditInputsSchema,
  auditRowSchema,
  dpeResultSchema,
  type AuditRow,
} from './schemas'

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

    const { data, error } = await supabase
      .from('brh_audits')
      .insert({
        inputs: inputs as unknown as Record<string, unknown>,
        results: {},
        pro_user_id: userData.user.id,
        status: 'draft',
      })
      .select()
      .single()
    if (error) throw error
    return auditRowSchema.parse(data)
  },

  /**
   * Mise à jour partielle d'un audit (uniquement si status=draft via RLS).
   */
  async update(id: string, partial: Partial<AuditRow>): Promise<AuditRow> {
    const { data, error } = await supabase
      .from('brh_audits')
      .update(partial)
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
    const inputs = auditInputsSchema.parse(audit.inputs) as unknown as AuditInputs
    const result = computeDpe(inputs)

    // Persiste les champs principaux + JSON results
    await auditsApi.update(id, {
      results: result as unknown as Record<string, unknown>,
      cep_kwh_ep_m2_an: result.cepKwhEpM2An,
      ges_kg_co2_m2_an: result.gesKgCo2M2An,
      etiquette_energie: result.etiquetteEnergie,
      etiquette_climat: result.etiquetteClimat,
    })

    return dpeResultSchema.parse(result) as unknown as DpeResult
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
}
