import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'

interface AutoEmailPayload {
  prospect_id: string
  new_status: string
  old_status: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Verifier le JWT et le role admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization requise' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verifier que l'appelant est admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerError || callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acces reserve aux admins' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const body = (await req.json()) as AutoEmailPayload
    const { prospect_id, new_status, old_status } = body

    if (!prospect_id || !new_status) {
      return new Response(
        JSON.stringify({ error: 'prospect_id et new_status requis' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Eviter les doublons si le statut n'a pas change
    if (new_status === old_status) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Statut identique' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Recuperer le prospect
    const { data: prospect, error: prospectError } = await supabaseAdmin
      .from('brh_prospects')
      .select('id, client_first_name, client_last_name, source_type, company_id, affiliate_id')
      .eq('id', prospect_id)
      .single()

    if (prospectError || !prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect introuvable' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const clientName = `${prospect.client_first_name} ${prospect.client_last_name}`

    // Trouver le destinataire selon la source du prospect
    let recipientEmail: string | null = null
    let recipientName = ''

    if (prospect.source_type === 'pro' && prospect.company_id) {
      // Source pro : trouver l'email du owner de la company
      const { data: company, error: companyError } = await supabaseAdmin
        .from('brh_companies')
        .select('owner_id, name')
        .eq('id', prospect.company_id)
        .single()

      if (!companyError && company?.owner_id) {
        const { data: ownerProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', company.owner_id)
          .single()

        if (ownerProfile?.email) {
          recipientEmail = ownerProfile.email
          recipientName = ownerProfile.full_name ?? company.name
        }
      }
    } else if (prospect.source_type === 'particulier' && prospect.affiliate_id) {
      // Source particulier : trouver l'email de l'affilie via son profile
      // brh_affiliates.id est reference dans brh_prospects.affiliate_id
      const { data: affiliate, error: affiliateError } = await supabaseAdmin
        .from('brh_affiliates')
        .select('id')
        .eq('id', prospect.affiliate_id)
        .single()

      if (!affiliateError && affiliate) {
        // Retrouver le profil lie a cet affilie (via auth user id)
        const { data: affiliateProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('affiliate_id', prospect.affiliate_id)
          .maybeSingle()

        if (affiliateProfile?.email) {
          recipientEmail = affiliateProfile.email
          recipientName = affiliateProfile.full_name ?? ''
        }
      }
    }

    if (!recipientEmail) {
      console.warn(`auto-email: aucun destinataire trouve pour prospect ${prospect_id} (${prospect.source_type})`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Aucun destinataire identifie' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Construire le contenu selon le nouveau statut
    const { subject, html } = buildEmailContent(new_status, clientName)

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY non configure — email non envoye')
      return new Response(
        JSON.stringify({ warning: 'Email provider non configure', to: recipientEmail }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: recipientEmail,
        subject,
        html: wrapInTemplate(html, recipientName),
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
    console.log(`auto-email: email envoye pour prospect ${prospect_id}, statut ${new_status} → ${recipientEmail}`)

    return new Response(
      JSON.stringify({ success: true, email_id: result.id, to: recipientEmail }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('auto-email error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})

interface EmailContent {
  subject: string
  html: string
}

function buildEmailContent(status: string, clientName: string): EmailContent {
  switch (status) {
    case 'etude':
      return {
        subject: `Votre prospect ${clientName} est en cours d'etude`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Bonne nouvelle ! Votre prospect <strong>${clientName}</strong> est actuellement en cours d'etude par nos experts BRH.
          </p>
          <div style="background:#f0f7f0;border-left:4px solid #1c7b1d;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#1c7b1d;font-size:14px;font-weight:600;">Etape : En cours d'etude</p>
            <p style="margin:4px 0 0;color:#555;font-size:13px;">Nos techniciens analysent le dossier. Vous serez notifie a chaque avancement.</p>
          </div>
          <p style="color:#666;font-size:13px;margin:0;">Vous pouvez suivre l'avancement de ce prospect directement depuis votre espace partenaire.</p>
        `,
      }

    case 'devis_envoye':
      return {
        subject: `Un devis a ete envoye a ${clientName}`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Un devis vient d'etre envoye a votre prospect <strong>${clientName}</strong>.
          </p>
          <div style="background:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#f57f17;font-size:14px;font-weight:600;">Etape : Devis envoye</p>
            <p style="margin:4px 0 0;color:#555;font-size:13px;">Le client est en phase de decision. Tout contact de votre part peut faire la difference !</p>
          </div>
          <p style="color:#666;font-size:13px;margin:0;">Votre commission sera calculee sur le montant signe. Restez disponible si le client a des questions.</p>
        `,
      }

    case 'signe':
      return {
        subject: `Felicitations ! ${clientName} a signe !`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Excellente nouvelle ! Votre prospect <strong>${clientName}</strong> vient de signer avec BRH.
          </p>
          <div style="background:#f0f7f0;border-left:4px solid #1c7b1d;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#1c7b1d;font-size:14px;font-weight:600;">Etape : Signe ✓</p>
            <p style="margin:4px 0 0;color:#555;font-size:13px;">Votre commission / vos points seront credites apres validation administrative.</p>
          </div>
          <p style="color:#666;font-size:13px;margin:0;">Merci pour votre apport ! Consultez votre espace partenaire pour suivre le versement de votre commission.</p>
        `,
      }

    case 'termine':
      return {
        subject: `Les travaux de ${clientName} sont termines`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Les travaux de votre prospect <strong>${clientName}</strong> sont maintenant termines.
          </p>
          <div style="background:#e8f5e9;border-left:4px solid #2e7d32;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#2e7d32;font-size:14px;font-weight:600;">Etape : Travaux termines</p>
            <p style="margin:4px 0 0;color:#555;font-size:13px;">Ce dossier est maintenant cloture avec succes.</p>
          </div>
          <p style="color:#666;font-size:13px;margin:0;">Merci pour votre confiance et votre partenariat avec BRH Habitat !</p>
        `,
      }

    case 'perdu':
      return {
        subject: `Le prospect ${clientName} n'a pas donne suite`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Nous vous informons que votre prospect <strong>${clientName}</strong> n'a malheureusement pas donne suite a notre proposition.
          </p>
          <div style="background:#fafafa;border-left:4px solid #bdbdbd;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#757575;font-size:14px;font-weight:600;">Etape : Perdu</p>
            <p style="margin:4px 0 0;color:#555;font-size:13px;">Ne vous decouragez pas, chaque recommandation compte et contribue a notre partenariat.</p>
          </div>
          <p style="color:#666;font-size:13px;margin:0;">Vous pouvez continuer a nous soumettre de nouveaux prospects depuis votre espace partenaire.</p>
        `,
      }

    default:
      return {
        subject: `Mise a jour du statut de votre prospect ${clientName}`,
        html: `
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Le statut de votre prospect <strong>${clientName}</strong> a ete mis a jour.
          </p>
          <p style="color:#666;font-size:13px;margin:0;">Connectez-vous a votre espace partenaire pour voir les details.</p>
        `,
      }
  }
}

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
