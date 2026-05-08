/**
 * Edge Function : send-rdv-confirmation
 *
 * Envoie 2 emails après création d'un rendez-vous public via /diagnostic/resultats :
 *   1. Email au CLIENT — accusé de réception avec récap des créneaux demandés
 *   2. Email à l'ADMIN BRH — notification d'un nouveau RDV à traiter
 *
 * Auth : public (rate-limited 5 req/min/IP) — appelée fire-and-forget depuis
 * ContactRdvModal après INSERT réussi dans brh_appointments. L'EF re-vérifie
 * que l'appointment existe vraiment avant d'envoyer.
 *
 * Body : { appointment_id: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'relationsclients@contact-brh.fr'

interface AppointmentRow {
  id: string
  contact_email: string | null
  contact_name: string | null
  contact_phone: string | null
  preferred_slot: string | null
  notes: string | null
  type: string
  diagnostic_id: string | null
  created_at: string
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY non configurée — email non envoyé', { to, subject })
    return false
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
    console.error(`Resend ${res.status}`, txt)
    return false
  }
  return true
}

function clientHtml(appt: AppointmentRow): string {
  const slot = appt.preferred_slot ?? 'À définir'
  const name = appt.contact_name ?? 'bonjour'
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1c1917;">
      <div style="background:#003404;padding:28px;text-align:center;">
        <h1 style="color:white;margin:0;font-family:Epilogue,Arial,sans-serif;font-size:24px;font-weight:700;">
          BRH Habitat
        </h1>
      </div>
      <div style="padding:32px 24px;background:#fafaf9;">
        <p style="font-size:16px;margin:0 0 16px;">Bonjour ${name},</p>
        <p style="font-size:14px;line-height:1.6;color:#44403c;">
          Nous avons bien reçu votre demande de rendez-vous concernant votre projet de rénovation
          énergétique. Notre équipe vous recontactera dans les <strong>48 heures ouvrées</strong>
          pour confirmer le créneau définitif.
        </p>
        <div style="background:white;border:1px solid #e7e5e4;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#57534e;font-weight:700;">
            Créneaux demandés
          </p>
          <p style="margin:0;font-size:14px;color:#1c1917;">${slot}</p>
        </div>
        ${appt.notes ? `<p style="font-size:13px;color:#57534e;background:#f5f5f4;padding:12px;border-radius:8px;"><strong>Vos notes :</strong> ${appt.notes}</p>` : ''}
        <p style="font-size:13px;color:#57534e;margin-top:24px;">
          Une question ? Répondez à cet email ou écrivez-nous à
          <a href="mailto:${ADMIN_EMAIL}" style="color:#00600a;">${ADMIN_EMAIL}</a>.
        </p>
      </div>
      <div style="padding:16px;text-align:center;font-size:11px;color:#a8a29e;">
        BRH Habitat — Rénovation énergétique en Bretagne
      </div>
    </div>
  `
}

function adminHtml(appt: AppointmentRow): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1c1917;">
      <h2 style="color:#003404;">Nouveau rendez-vous demandé</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Nom</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.contact_name ?? '—'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Email</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.contact_email ?? '—'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Téléphone</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.contact_phone ?? '—'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Type</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.type}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Créneaux</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.preferred_slot ?? '—'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e7e5e4;"><strong>Diagnostic</strong></td><td style="padding:8px;border-bottom:1px solid #e7e5e4;">${appt.diagnostic_id ?? '—'}</td></tr>
        ${appt.notes ? `<tr><td colspan="2" style="padding:8px;"><strong>Notes :</strong> ${appt.notes}</td></tr>` : ''}
      </table>
      <p style="margin-top:24px;font-size:13px;">
        <a href="https://www.renovation-brh.fr/admin/rdv" style="background:#00600a;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold;">Traiter dans /admin/rdv</a>
      </p>
    </div>
  `
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit : 5 req/min/IP — public mais protège contre spam
  const rl = checkRateLimit(req, 'send-rdv-confirmation', { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json().catch(() => ({})) as { appointment_id?: string }
    if (!body.appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: appt, error } = await supa
      .from('brh_appointments')
      .select('id, contact_email, contact_name, contact_phone, preferred_slot, notes, type, diagnostic_id, created_at')
      .eq('id', body.appointment_id)
      .single()

    if (error || !appt) {
      return new Response(JSON.stringify({ error: 'appointment_not_found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const a = appt as AppointmentRow

    // Email client (si email présent)
    const clientSent = a.contact_email
      ? await sendEmail(
          a.contact_email,
          'Votre demande de rendez-vous a bien été reçue — BRH Habitat',
          clientHtml(a),
        )
      : false

    // Email admin (toujours)
    const adminSent = await sendEmail(
      ADMIN_EMAIL,
      `[BRH] Nouveau RDV demandé — ${a.contact_name ?? 'Anonyme'}`,
      adminHtml(a),
    )

    return new Response(
      JSON.stringify({ ok: true, client_sent: clientSent, admin_sent: adminSent }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-rdv-confirmation error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
