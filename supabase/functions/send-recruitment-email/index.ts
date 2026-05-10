/**
 * Edge Function : send-recruitment-email (Phase Employé V2.2).
 *
 * Envoie un email de recrutement (artisan/agence/architecte/MOE) depuis un
 * employé BRH vers un destinataire externe. Template + variables fournis par
 * le client. Insère une row dans brh_email_sends pour tracking + déclenche
 * l'incrément du score d'activité de l'employé (+5 pts via brh_employee_actions).
 *
 * Body : {
 *   template_slug: string,
 *   recipient_email: string,
 *   recipient_name?: string,
 *   recipient_company?: string,
 *   recipient_audience?: string,
 *   custom_variables?: Record<string, string>
 * }
 *
 * Auth : Bearer token employé. Vérifie qu'il existe bien dans brh_employees.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'

interface RequestBody {
  template_slug: string
  recipient_email: string
  recipient_name?: string
  recipient_company?: string
  recipient_audience?: string
  custom_variables?: Record<string, string>
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY non configurée' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `BRH Habitat <${EMAIL_FROM}>`,
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    return { ok: false, error: `Resend ${res.status}: ${txt}` }
  }
  const data = await res.json()
  return { ok: true, messageId: data.id }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit anti-spam : 30 mails/min/IP (1 employé envoie ~5-10 mails par session)
  const rl = checkRateLimit(req, 'send-recruitment-email', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifier le user
    const token = authHeader.slice(7)
    const { data: userResp, error: userErr } = await supa.auth.getUser(token)
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier qu'il est bien employé BRH
    const { data: employee } = await supa
      .from('brh_employees')
      .select('id, full_name, email, signature_html, role_label')
      .eq('profile_id', userResp.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!employee) {
      return new Response(JSON.stringify({ error: 'forbidden — employé non trouvé' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    if (!body.template_slug || !body.recipient_email) {
      return new Response(JSON.stringify({ error: 'template_slug et recipient_email requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipient_email)) {
      return new Response(JSON.stringify({ error: 'recipient_email invalide' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Charger le template
    const { data: template, error: tplErr } = await supa
      .from('brh_email_templates')
      .select('*')
      .eq('slug', body.template_slug)
      .eq('is_active', true)
      .maybeSingle()

    if (tplErr || !template) {
      return new Response(JSON.stringify({ error: 'template introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Construire le rendu
    const defaultSignature = `${employee.full_name}<br>${employee.role_label}<br>BRH Habitat — Réseau breton de la rénovation`
    const variables: Record<string, string> = {
      nom_destinataire: body.recipient_name ?? 'Madame, Monsieur',
      ville: body.custom_variables?.ville ?? 'votre ville',
      employe_nom: employee.full_name,
      employe_signature: employee.signature_html ?? defaultSignature,
      ...(body.custom_variables ?? {}),
    }

    const renderedSubject = renderTemplate(template.subject, variables)
    const renderedBody = renderTemplate(template.body_html, variables)

    // Envoi
    const sendResult = await sendEmail(body.recipient_email, renderedSubject, renderedBody)

    // Insert dans brh_email_sends (toujours, même en cas d'échec, pour traçabilité)
    const { data: sendRow, error: insertErr } = await supa
      .from('brh_email_sends')
      .insert({
        employee_id: employee.id,
        template_id: template.id,
        recipient_email: body.recipient_email,
        recipient_name: body.recipient_name ?? null,
        recipient_company: body.recipient_company ?? null,
        recipient_audience: body.recipient_audience ?? template.target_audience,
        subject: renderedSubject,
        body_html: renderedBody,
        resend_message_id: sendResult.messageId ?? null,
        status: sendResult.ok ? 'sent' : 'failed',
      })
      .select('id')
      .single()

    if (insertErr) console.error('insert send failed', insertErr)

    if (!sendResult.ok) {
      return new Response(JSON.stringify({ ok: false, error: sendResult.error, send_id: sendRow?.id }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Score : +5 pts pour email envoyé
    await supa.from('brh_employee_actions').insert({
      employee_id: employee.id,
      action_type: 'email_sent',
      points: 5,
      related_entity_type: 'email_send',
      related_entity_id: sendRow?.id ?? null,
      notes: `Recrutement ${template.target_audience} — ${body.recipient_email}`,
    })

    return new Response(
      JSON.stringify({
        ok: true,
        send_id: sendRow?.id,
        message_id: sendResult.messageId,
        points_earned: 5,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-recruitment-email error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
