import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'

interface EmailPayload {
  recipient_id: string
  subject: string
  html: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Rate limit : 10 req/min par IP
  const rl = checkRateLimit(req, 'send-notification-email', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requetes' }),
      { status: 429, headers: { ...getCorsHeaders(req), ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { recipient_id, subject, html } = (await req.json()) as EmailPayload

    if (!recipient_id || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'recipient_id, subject et html requis' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Recuperer l'email du destinataire
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', recipient_id)
      .single()

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: 'Destinataire introuvable' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY non configure — email non envoye')
      return new Response(
        JSON.stringify({ warning: 'Email provider non configure', to: profile.email }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Envoyer via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: profile.email,
        subject,
        html: wrapInTemplate(html, profile.full_name ?? ''),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Echec envoi email', details: errorText }),
        { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const result = await response.json()
    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-notification-email error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})

function wrapInTemplate(content: string, recipientName: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:#1c7b1d;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:2px;">BRH</h1>
      <p style="margin:4px 0 0;color:#81c784;font-size:12px;text-transform:uppercase;letter-spacing:3px;">Bretagne Renovation Habitat</p>
    </div>
    <div style="padding:32px;">
      ${recipientName ? `<p style="margin:0 0 16px;color:#333;font-size:15px;">Bonjour ${recipientName},</p>` : ''}
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;text-align:center;">
        Bretagne Renovation Habitat — 35 rue de Kervao, 29490 Guipavas<br/>
        <a href="https://www.renovation-brh.fr" style="color:#1c7b1d;text-decoration:none;">renovation-brh.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
