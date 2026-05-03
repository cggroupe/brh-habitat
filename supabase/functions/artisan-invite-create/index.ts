/**
 * Edge Function : artisan-invite-create (Phase 13.6.5)
 *
 * Admin BRH crée une invitation magic link pour un artisan.
 * Génère token via SQL helper, envoie email Resend avec lien.
 *
 * Body : { artisanId: string, emailTo?: string, messagePersonnel?: string }
 * Returns : { invitationId, token, urlOnboarding, sent }
 *
 * Auth : admin uniquement.
 * Rate limit : 30/min/IP (admin envoie en bulk si besoin).
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.renovation-brh.fr'

interface RequestBody {
  artisanId: string
  emailTo?: string
  messagePersonnel?: string
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(opts: {
  nomEntreprise: string
  representant: string | null
  url: string
  message: string | null
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Invitation BRH Habitat</title></head>
<body style="margin:0;padding:0;background:#f5f3f2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="padding:24px 32px;background:linear-gradient(135deg,#1c7b1d 0%,#094114 100%);color:#fff;">
        <div style="font-size:24px;font-weight:bold;">🔧 Bienvenue chez BRH Habitat</div>
        <div style="font-size:14px;opacity:0.9;margin-top:4px;">Invitation à rejoindre la marketplace artisans RGE bretons</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
          Bonjour <strong>${escapeHtml(opts.representant ?? opts.nomEntreprise)}</strong>,
        </p>
        <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">
          BRH Habitat — Bretagne Rénovation Habitat — vous invite à rejoindre sa marketplace
          d'artisans RGE bretons. Plus de 59 000 propriétaires de logements DPE F/G en Bretagne
          sont qualifiés sur notre plateforme par des auditeurs RGE certifiés.
        </p>
        ${
          opts.message
            ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:4px;font-size:13px;color:#78350f;font-style:italic;">${escapeHtml(opts.message)}</div>`
            : ''
        }
        <h2 style="font-size:16px;color:#1c7b1d;margin-top:24px;">✨ Pourquoi rejoindre BRH ?</h2>
        <ul style="font-size:13px;line-height:1.6;color:#374151;padding-left:20px;">
          <li><strong>Leads qualifiés gratuits</strong> — recevez des prospects bretons audités, MPR éligibles, prêts à signer</li>
          <li><strong>Zéro abonnement de base</strong> — vous payez 5 % du chantier UNIQUEMENT si vous signez</li>
          <li><strong>Onboarding en 30 secondes</strong> — cliquez le bouton ci-dessous, c'est tout</li>
          <li><strong>Score qualité dynamique</strong> — vos chantiers réussis vous donnent priorité sur les nouveaux leads</li>
        </ul>
        <div style="text-align:center;margin:32px 0 16px;">
          <a href="${opts.url}" style="display:inline-block;padding:14px 32px;background:#1c7b1d;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
            🚀 Activer mon compte BRH
          </a>
        </div>
        <p style="font-size:11px;color:#6b7280;text-align:center;margin:16px 0 0;">
          Ce lien est valable <strong>30 jours</strong>. Aucun mot de passe requis — onboarding par email magic link.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f5f3f2;font-size:11px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;">
        Bretagne Rénovation Habitat — réseau d'auditeurs RGE bretons<br>
        Si vous n'êtes pas le destinataire, ignorez ce message.
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'artisan-invite-create', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requis' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await userClient.auth.getUser()
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Auth invalide' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifie role admin
    const { data: profile } = await supa
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single<{ role: string }>()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin uniquement' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    if (!body.artisanId) {
      return new Response(JSON.stringify({ error: 'artisanId requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Charge l'artisan
    const { data: artisan, error: aErr } = await supa
      .from('brh_artisans_rge')
      .select('id,nom_entreprise,representant,email,profile_id')
      .eq('id', body.artisanId)
      .single<{
        id: string
        nom_entreprise: string
        representant: string | null
        email: string | null
        profile_id: string | null
      }>()

    if (aErr || !artisan) {
      return new Response(JSON.stringify({ error: 'Artisan introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (artisan.profile_id) {
      return new Response(JSON.stringify({ error: 'Artisan déjà lié à un compte' }), {
        status: 409,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const emailTo = body.emailTo ?? artisan.email
    if (!emailTo) {
      return new Response(
        JSON.stringify({ error: 'Aucun email destinataire (artisan sans email + emailTo non fourni)' }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Génère token via helper SQL
    const { data: tokenRow, error: tErr } = await supa.rpc('brh_gen_artisan_token')
    if (tErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'gen_token failed', details: tErr?.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const token = tokenRow as string

    // Insert invitation
    const { data: inv, error: iErr } = await supa
      .from('brh_artisan_invitations')
      .insert({
        artisan_id: artisan.id,
        token,
        email_to: emailTo,
        created_by: userData.user.id,
        message_personnel: body.messagePersonnel ?? null,
        status: 'pending',
      })
      .select('id,token')
      .single<{ id: string; token: string }>()

    if (iErr || !inv) {
      return new Response(
        JSON.stringify({ error: 'Insert invitation failed', details: iErr?.message }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const url = `${SITE_URL}/artisan/onboarding/${token}`

    // Envoie email Resend (best-effort)
    let sent = false
    if (RESEND_API_KEY) {
      const html = buildEmailHtml({
        nomEntreprise: artisan.nom_entreprise,
        representant: artisan.representant,
        url,
        message: body.messagePersonnel ?? null,
      })
      const subject = `🚀 Activation BRH Habitat — ${artisan.nom_entreprise}`

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BRH Habitat <${EMAIL_FROM}>`,
          to: [emailTo],
          subject,
          html,
        }),
      })

      if (resendRes.ok) {
        sent = true
        await supa
          .from('brh_artisan_invitations')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', inv.id)
      } else {
        console.warn('Resend invite failed:', await resendRes.text())
      }
    }

    return new Response(
      JSON.stringify({
        invitationId: inv.id,
        token: inv.token,
        urlOnboarding: url,
        sent,
        emailTo,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('artisan-invite-create error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
