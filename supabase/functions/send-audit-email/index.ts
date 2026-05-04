/**
 * Edge Function : send-audit-email
 *
 * Envoie le PDF d'audit DPE au client par email via Resend.
 *
 * Workflow :
 * 1. Vérifier auth (JWT du pro RGE qui appelle)
 * 2. Vérifier que le caller est bien pro_user_id de l'audit
 * 3. Générer URL signée 30 jours du PDF dans Storage
 * 4. Envoyer email Resend avec lien
 * 5. Logger dans brh_audit_emails (audit trail RGPD)
 *
 * Body : { auditId, recipientEmail, message? }
 * Returns : { ok: true, resendId, signedUrl }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'BRH Habitat <noreply@renovation-brh.fr>'

interface RequestBody {
  auditId: string
  recipientEmail: string
  message?: string
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit : 5 emails / min par caller (pour éviter spam)
  const rl = checkRateLimit(req, 'send-audit-email', { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes — patientez 1 minute' }),
      { status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Auth requise' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.slice(7)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Body parse + validation
    const body: RequestBody = await req.json()
    if (!body.auditId || !body.recipientEmail) {
      return new Response(JSON.stringify({ error: 'auditId et recipientEmail requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipientEmail)) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Vérifie que caller est bien pro_user_id de l'audit
    const { data: audit, error: auditErr } = await supabase
      .from('brh_audits')
      .select('id, pro_user_id, status, etiquette_energie, etiquette_climat, cep_kwh_ep_m2_an')
      .eq('id', body.auditId)
      .single()
    if (auditErr || !audit) {
      return new Response(JSON.stringify({ error: 'Audit introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (audit.pro_user_id !== caller.id) {
      // Vérifier si admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', caller.id)
        .single()
      if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Accès refusé' }), {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    }

    // Générer URL signée 30 jours pour le PDF
    const path = `${audit.id}/audit.pdf`
    const { data: signed, error: signErr } = await supabase.storage
      .from('audits')
      .createSignedUrl(path, 60 * 60 * 24 * 30)
    if (signErr || !signed) {
      return new Response(
        JSON.stringify({ error: 'PDF introuvable. Générez-le avant de l\'envoyer.' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Construire l'email
    const subject = "Votre audit énergétique BRH Habitat"
    const html = buildEmailHtml({
      etiquette: audit.etiquette_energie ?? 'G',
      cep: Math.round(audit.cep_kwh_ep_m2_an ?? 0),
      pdfUrl: signed.signedUrl,
      customMessage: body.message,
    })

    // Log pending dans brh_audit_emails
    const { data: emailLog, error: logErr } = await supabase
      .from('brh_audit_emails')
      .insert({
        audit_id: audit.id,
        sent_by: caller.id,
        recipient_email: body.recipientEmail,
        subject,
        message: body.message ?? null,
        status: 'pending',
      })
      .select()
      .single()
    if (logErr) console.warn('audit_emails log insert failed:', logErr.message)

    // Envoi via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: body.recipientEmail,
        subject,
        html,
      }),
    })

    if (!resendRes.ok) {
      const errorText = await resendRes.text()
      console.error('Resend error:', errorText)
      if (emailLog) {
        await supabase
          .from('brh_audit_emails')
          .update({ status: 'failed', error_message: errorText })
          .eq('id', emailLog.id)
      }
      return new Response(
        JSON.stringify({ error: 'Échec envoi email', details: errorText }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const result = await resendRes.json()

    // Update log : sent
    if (emailLog) {
      await supabase
        .from('brh_audit_emails')
        .update({
          status: 'sent',
          resend_id: result.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', emailLog.id)
    }

    return new Response(
      JSON.stringify({ ok: true, resendId: result.id, signedUrl: signed.signedUrl }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-audit-email error:', err)
    return new Response(JSON.stringify({ error: 'Erreur interne', details: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

function buildEmailHtml(opts: {
  etiquette: string
  cep: number
  pdfUrl: string
  customMessage?: string
}): string {
  const dpeColors: Record<string, string> = {
    A: '#319834', B: '#33CC33', C: '#CCCC33', D: '#FFCC33',
    E: '#FF9933', F: '#FF6633', G: '#FF3333',
  }
  const color = dpeColors[opts.etiquette] ?? '#FF3333'
  const textColor = ['C', 'D'].includes(opts.etiquette) ? '#000' : '#fff'

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:#1c7b1d;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:2px;">BRH</h1>
      <p style="margin:4px 0 0;color:#81c784;font-size:12px;text-transform:uppercase;letter-spacing:3px;">Bretagne Rénovation Habitat</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;color:#1c7b1d;font-size:20px;">Votre audit énergétique est prêt</h2>
      ${opts.customMessage ? `<div style="background:#f0f9f0;border-left:4px solid #1c7b1d;padding:12px 16px;margin-bottom:16px;border-radius:4px;font-style:italic;color:#333;">${opts.customMessage.replace(/</g, '&lt;')}</div>` : ''}
      <p style="color:#333;line-height:1.6;">
        Votre artisan RGE a finalisé l'audit énergétique de votre logement selon la
        méthode officielle 3CL-DPE 2021.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:16px 24px;background:${color};color:${textColor};border-radius:8px;">
          <div style="font-size:48px;font-weight:bold;line-height:1;">${opts.etiquette}</div>
          <div style="font-size:14px;margin-top:6px;">${opts.cep} kWh EP/m²/an</div>
        </div>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${opts.pdfUrl}" style="display:inline-block;padding:14px 28px;background:#1c7b1d;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          📄 Télécharger mon audit (PDF)
        </a>
      </div>

      <p style="color:#666;font-size:13px;line-height:1.5;">
        Le lien de téléchargement est valable 30 jours. Conservez précieusement votre audit :
        il vous servira à planifier vos travaux de rénovation et à demander vos aides.
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

      <p style="color:#666;font-size:13px;line-height:1.5;">
        <strong>Prochaine étape :</strong> votre artisan vous contactera pour discuter
        des travaux qui amélioreront votre étiquette DPE et réduiront vos consommations.
      </p>
    </div>
    <div style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:11px;text-align:center;">
        Bretagne Rénovation Habitat<br/>
        <a href="https://www.renovation-brh.fr" style="color:#1c7b1d;text-decoration:none;">renovation-brh.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
