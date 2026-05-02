/**
 * API prospect-letters — Phase 13.
 *
 * Killer feature : génération IA de courrier de prospection.
 * Pair volontaire avec hooks/queries/prospect-letters.ts (pattern API ↔ Hooks).
 */

import { supabase } from '@/lib/supabase'

export interface ProspectLetterRow {
  id: string
  prospect_id: number
  generated_by: string
  subject: string
  body_md: string
  greeting: string | null
  signature: string | null
  score_v2_at_generation: number | null
  segment_at_generation: string | null
  signaux_used: { signaux?: string[] } | null
  status: 'draft' | 'edited' | 'sent' | 'archived'
  sent_via: 'email' | 'pdf_print' | 'postal' | null
  sent_at: string | null
  model_used: string
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_creation_tokens: number | null
  generation_duration_ms: number | null
  created_at: string
  updated_at: string
}

export interface GenerateLetterResult {
  id: string
  subject: string
  greeting: string
  body_md: string
  signature: string
  signaux_used: string[]
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
  duration_ms: number
}

export const prospectLettersApi = {
  /**
   * Génère un courrier IA pour un prospect (EF Claude Opus 4.7).
   * Persiste en base et retourne le contenu pour preview.
   */
  async generate(prospectId: number): Promise<GenerateLetterResult> {
    const { data, error } = await supabase.functions.invoke<GenerateLetterResult>(
      'generate-prospect-letter',
      { body: { prospectId } },
    )
    if (error) throw error
    if (!data) throw new Error('Réponse vide generate-prospect-letter')
    return data
  },

  /**
   * Liste les courriers d'un prospect (RLS = pro voit les siens).
   */
  async listByProspect(prospectId: number): Promise<ProspectLetterRow[]> {
    const { data, error } = await supabase
      .from('brh_prospect_letters')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as ProspectLetterRow[]
  },

  /**
   * Charge un courrier par ID.
   */
  async get(id: string): Promise<ProspectLetterRow | null> {
    const { data, error } = await supabase
      .from('brh_prospect_letters')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return (data as unknown as ProspectLetterRow) ?? null
  },

  /**
   * Édite un courrier (sujet, body, greeting, signature, status).
   */
  async update(
    id: string,
    patch: Partial<Pick<ProspectLetterRow, 'subject' | 'body_md' | 'greeting' | 'signature' | 'status' | 'sent_via'>>,
  ): Promise<ProspectLetterRow> {
    const update: Record<string, unknown> = { ...patch }
    if (patch.status === 'sent' && !('sent_at' in patch)) {
      update.sent_at = new Date().toISOString()
    }
    if (patch.body_md && patch.status !== 'sent') {
      update.status = 'edited'
    }
    const { data, error } = await supabase
      .from('brh_prospect_letters')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as unknown as ProspectLetterRow
  },

  /**
   * Archive (delete RLS-policy autorise propriétaire).
   */
  async archive(id: string): Promise<void> {
    const { error } = await supabase.from('brh_prospect_letters').delete().eq('id', id)
    if (error) throw error
  },
}
