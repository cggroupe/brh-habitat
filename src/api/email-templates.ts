/**
 * API brh_email_templates + brh_email_sends — Phase Employé V2.2.
 */
import { supabase } from '@/lib/supabase'
import { edgeFunctionUrl } from '@/lib/config'

export type TargetAudience = 'artisan' | 'agence_immo' | 'architecte' | 'maitre_oeuvre' | 'autre'

export interface EmailTemplate {
  id: string
  slug: string
  target_audience: TargetAudience
  subject: string
  body_html: string
  variables: string[]
  is_active: boolean
  created_at: string
}

export interface EmailSend {
  id: string
  employee_id: string
  template_id: string | null
  recipient_email: string
  recipient_name: string | null
  recipient_company: string | null
  recipient_audience: string | null
  subject: string
  body_html: string
  resend_message_id: string | null
  sent_at: string
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  status: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
}

export const emailTemplatesApi = {
  async list(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('brh_email_templates')
      .select('*')
      .eq('is_active', true)
      .order('target_audience')
    if (error) throw error
    return (data ?? []) as EmailTemplate[]
  },

  async myRecentSends(employeeId: string, limit = 20): Promise<EmailSend[]> {
    const { data, error } = await supabase
      .from('brh_email_sends')
      .select('*')
      .eq('employee_id', employeeId)
      .order('sent_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as EmailSend[]
  },

  async send(input: {
    template_slug: string
    recipient_email: string
    recipient_name?: string
    recipient_company?: string
    custom_variables?: Record<string, string>
  }): Promise<{ ok: boolean; send_id?: string; points_earned?: number; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Non authentifié')

    const res = await fetch(edgeFunctionUrl('send-recruitment-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    })
    return await res.json()
  },
}
