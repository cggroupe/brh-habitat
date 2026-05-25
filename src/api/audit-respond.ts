/**
 * audit-respond — Réponse anon à un audit agence via lien magic-link.
 *
 * Source : RPC brh_audit_respond (migration 20260525120000).
 * Remplace la policy RLS UPDATE TO anon droppée 24/05 pour vulnérabilité.
 *
 * Usage : appelé par src/pages/public/AuditRespondPage.tsx (route /audit/respond?token=xxx).
 */
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

export const AUDIT_FEEDBACK_OPTIONS = [
  'correct',
  'intrusive',
  'not_contacted',
  'interested',
  'complaint',
] as const

export type AuditFeedback = (typeof AUDIT_FEEDBACK_OPTIONS)[number]

const AuditRespondInputSchema = z.object({
  token: z.string().min(10).max(128),
  feedback: z.enum(AUDIT_FEEDBACK_OPTIONS),
  feedback_message: z.string().max(2000).optional().default(''),
})

export type AuditRespondInput = z.infer<typeof AuditRespondInputSchema>

const AuditRespondOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export type AuditRespondOutput = z.infer<typeof AuditRespondOutputSchema>

export const auditRespondApi = {
  async respond(input: AuditRespondInput): Promise<AuditRespondOutput> {
    const parsed = AuditRespondInputSchema.parse(input)
    const { data, error } = await supabase.rpc('brh_audit_respond', {
      p_token: parsed.token,
      p_feedback: parsed.feedback,
      p_feedback_message: parsed.feedback_message,
    })
    if (error) throw error
    const row = (data as AuditRespondOutput[] | null)?.[0]
    if (!row) {
      throw new Error('Réponse vide du serveur')
    }
    return AuditRespondOutputSchema.parse(row)
  },
}
