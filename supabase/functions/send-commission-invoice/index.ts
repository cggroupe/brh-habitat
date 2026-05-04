/**
 * Edge Function : send-commission-invoice (Phase 13.6.7.2)
 *
 * Envoie la facture commission BRH à l'artisan par email Resend
 * avec un signed URL 30 jours vers le PDF dans Supabase Storage.
 *
 * Pré-requis : le PDF doit déjà avoir été uploadé dans le bucket
 * 'brh-commission-invoices' via supabase-js côté admin (front).
 *
 * Body : { invoiceId: string }
 * Returns : { sent: true, resendId, signedUrl }
 *
 * Auth : admin uniquement.
 * Rate limit : 30/min/IP.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'
const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO') ?? 'compta@brh-habitat.fr'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

interface RequestBody {
  invoiceId: string
}

interface InvoiceRow {
  id: string
  artisan_id: string
  period_year: number
  period_month: number
  nb_leads_completed: number
  total_chantiers_ttc_eur: number
  total_commission_due_eur: number
  pdf_path: string | null
  status: string
}

interface ArtisanRow {
  nom_entreprise: string
  representant: string | null
  email: string | null
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

function formatEur(n: number): string {
  return `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function buildEmailHtml(opts: {
  representant: string | null
  nomEntreprise: string
  periodLabel: string
  nbLeads: number
  totalChantiers: number
  commission: number
  signedUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Facture commission BRH</title></head>
<body style="margin:0;padding:0;background:#f5f3f2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="padding:24px 32px;background:linear-gradient(135deg,#1c7b1d 0%,#094114 100%);color:#ffffff;">
        <div style="font-size:22px;font-weight:bold;">💰 Votre facture commission BRH</div>
        <div style="font-size:13px;opacity:0.9;margin-top:4px;">Période ${escapeHtml(opts.periodLabel)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">
          Bonjour <strong>${escapeHtml(opts.representant ?? opts.nomEntreprise)}</strong>,
        </p>
        <p style="font-size:13px;line-height:1.6;margin:0 0 16px;">
          Votre facture de commission pour les chantiers BRH Habitat signés en
          <strong>${escapeHtml(opts.periodLabel)}</strong> est désormais disponible.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:6px;margin:16px 0;">
          <table style="width:100%;font-size:13px;">
            <tr>
              <td style="padding:4px 0;color:#6b7280;">Chantiers signés</td>
              <td style="padding:4px 0;text-align:right;font-weight:bold;">${opts.nbLeads}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6b7280;">CA total chantiers TTC</td>
              <td style="padding:4px 0;text-align:right;font-weight:bold;">${escapeHtml(formatEur(opts.totalChantiers))}</td>
            </tr>
            <tr style="border-top:1px solid #d1d5db;">
              <td style="padding:8px 0 4px;color:#1c7b1d;font-weight:bold;">Commission à régler</td>
              <td style="padding:8px 0 4px;text-align:right;font-weight:bold;font-size:16px;color:#1c7b1d;">${escapeHtml(formatEur(opts.commission))}</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;margin:32px 0 16px;">
          <a href="${opts.signedUrl}" style="display:inline-block;padding:14px 32px;background:#1c7b1d;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">
            📄 Télécharger ma facture (PDF)
          </a>
        </div>

        <p style="font-size:11px;color:#6b7280;text-align:center;margin:16px 0 0;">
          Lien valable <strong>30 jours</strong>. Échéance de règlement : 30 jours à compter de l'émission.
        </p>

        <div style="margin-top:24px;padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;font-size:11px;color:#78350f;">
          <strong>Modalités de paiement</strong> : virement bancaire (IBAN dans le PDF). Indiquez
          le numéro de facture en référence pour faciliter le rapprochement comptable.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f5f3f2;font-size:11px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;">
        BRH Habitat — Bretagne Rénovation Habitat<br>
        Pour toute question, répondez à ce mail (${escapeHtml(EMAIL_REPLY_TO)}).
      </td>
    </tr>
  </table>
</body></html>`
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'send-commission-invoice', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend non configuré', message: 'RESEND_API_KEY absent.' }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requise' }), {
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
    if (!body.invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Charge facture + artisan
    const { data: invoice, error: iErr } = await supa
      .from('brh_commission_invoices')
      .select('*')
      .eq('id', body.invoiceId)
      .single<InvoiceRow>()
    if (iErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Facture introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!invoice.pdf_path) {
      return new Response(
        JSON.stringify({ error: 'PDF non uploadé', message: 'Générez et uploadez le PDF avant l\'envoi.' }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { data: artisan, error: aErr } = await supa
      .from('brh_artisans_rge')
      .select('nom_entreprise,representant,email')
      .eq('id', invoice.artisan_id)
      .single<ArtisanRow>()

    if (aErr || !artisan) {
      return new Response(JSON.stringify({ error: 'Artisan introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!artisan.email) {
      return new Response(
        JSON.stringify({ error: 'Artisan sans email', message: 'Pas d\'email pour cet artisan.' }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Génère signed URL 30j
    const { data: signed, error: sErr } = await supa.storage
      .from('brh-commission-invoices')
      .createSignedUrl(invoice.pdf_path, 30 * 24 * 60 * 60)

    if (sErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Signed URL failed', details: sErr?.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const periodLabel = `${MONTHS_FR[invoice.period_month - 1]} ${invoice.period_year}`
    const html = buildEmailHtml({
      representant: artisan.representant,
      nomEntreprise: artisan.nom_entreprise,
      periodLabel,
      nbLeads: invoice.nb_leads_completed,
      totalChantiers: Number(invoice.total_chantiers_ttc_eur),
      commission: Number(invoice.total_commission_due_eur),
      signedUrl: signed.signedUrl,
    })

    const subject = `💰 Facture commission BRH ${periodLabel} — ${formatEur(Number(invoice.total_commission_due_eur))}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `BRH Habitat <${EMAIL_FROM}>`,
        to: [artisan.email],
        reply_to: EMAIL_REPLY_TO,
        subject,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('Resend error:', resendRes.status, err)
      return new Response(JSON.stringify({ error: `Resend ${resendRes.status}`, details: err }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resendData = (await resendRes.json()) as { id?: string }

    // Update invoice status + tracking
    await supa
      .from('brh_commission_invoices')
      .update({
        status: invoice.status === 'pending' ? 'invoiced' : invoice.status,
        invoiced_at: new Date().toISOString(),
        email_sent_at: new Date().toISOString(),
        email_resend_id: resendData.id ?? null,
      })
      .eq('id', invoice.id)

    return new Response(
      JSON.stringify({
        sent: true,
        resendId: resendData.id,
        signedUrl: signed.signedUrl,
        to: artisan.email,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-commission-invoice error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
