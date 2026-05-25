/**
 * Edge Function : monthly-audit-agencies (Phase 16.0.9 — refactored 25/05 Phase 2.5)
 *
 * Pipeline mensuel d'audit aléatoire des contacts agences.
 *
 * 1. Calcule le mois précédent (date_trunc month)
 * 2. Appelle le helper SQL `brh_generate_monthly_audits(audit_month)`
 *    qui sample 5 % des leads contactés, insère dans brh_agence_audits
 *    et auto-remplit `contact_email` via JOIN sur brh_personnes_historique
 *    (match adresse_ban_id quand possible).
 * 3. Pour chaque audit créé avec `contact_email` non-null et `email_sent_at`
 *    null, envoie un email Resend contenant le lien `/audit/respond?token=xxx`
 *    (page publique livrée Phase 2 25/05).
 *
 * Preview-safe :
 *   - Si RESEND_API_KEY absent : génère les audits mais skip l'envoi
 *     (email_sent_at reste NULL).
 *   - Si contact_email absent : skip cet audit (status reste 'sent', audit
 *     peut être traité manuellement par admin BRH).
 *
 * Invocation : daily ou monthly via pg_cron, ou manuel par admin BRH.
 * Body : { audit_month?: 'YYYY-MM-01' }   (default: mois précédent)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  audit_month?: string
  /** Pour tests/admin : forcer le re-envoi même si email_sent_at déjà set. */
  force_resend?: boolean
}

function getPreviousMonthFirst(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const EMAIL_FROM = Deno.env.get('AUDIT_EMAIL_FROM') ?? 'BRH Habitat <contact@contact-brh.fr>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://brh-habitat.vercel.app'

function buildAuditEmailHtml(token: string, agenceName: string | null): string {
  const respondUrl = `${APP_URL}/audit/respond?token=${encodeURIComponent(token)}`
  const agenceLabel = agenceName ?? 'une agence partenaire'
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="color: #059669; margin-bottom: 16px;">BRH Habitat — audit qualité</h2>
  <p>Bonjour,</p>
  <p>
    Vous avez récemment été contacté(e) par <strong>${agenceLabel}</strong>, une agence
    immobilière partenaire de BRH Habitat. Pour améliorer la qualité de notre réseau,
    nous menons un audit anonyme et confidentiel.
  </p>
  <p>
    Pouvez-vous nous dire en 1 minute comment s'est passé ce contact ?
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${respondUrl}"
       style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Répondre à l'audit
    </a>
  </p>
  <p style="font-size: 13px; color: #6b7280;">
    Ce lien est unique et ne fonctionne qu'une seule fois. Votre réponse est
    traitée confidentiellement par l'équipe qualité BRH.
  </p>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
    Vous ne souhaitez plus recevoir de communications BRH ?
    <a href="${APP_URL}/opt-out" style="color: #6b7280;">Demande RGPD</a>
  </p>
</body>
</html>`
}

async function sendResendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json() as { id?: string }
    return { ok: true, id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const adminToken = req.headers.get('x-brh-admin-token')
  const expectedToken = Deno.env.get('BRH_ADMIN_KEY')
  if (!expectedToken || adminToken !== expectedToken) {
    return new Response(
      JSON.stringify({ error: 'Admin token requis' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const auditMonth = body.audit_month ?? getPreviousMonthFirst()
    const forceResend = body.force_resend === true

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Génère les audits via le helper SQL (idempotent, auto-fill contact_email)
    const { data: countCreated, error: rpcErr } = await supa.rpc(
      'brh_generate_monthly_audits',
      { p_audit_month: auditMonth },
    )
    if (rpcErr) throw rpcErr

    // 2. Récupère les audits envoyables ce mois (contact_email non null
    //    + email_sent_at null OR force_resend)
    const query = supa
      .from('brh_agence_audits')
      .select('id, response_token, contact_email, agence_id, brh_agences_immo!inner(nom_commercial)')
      .eq('audit_month', auditMonth)
      .not('contact_email', 'is', null)

    if (!forceResend) {
      query.is('email_sent_at', null)
    }

    const { data: pendingAudits, error: listErr } = await query
    if (listErr) throw listErr

    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailsSent = 0
    let emailsSkipped = 0
    let emailsFailed = 0

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          ok: true,
          audit_month: auditMonth,
          audits_created: countCreated ?? 0,
          audits_with_email: pendingAudits?.length ?? 0,
          emails_sent: 0,
          warning: 'RESEND_API_KEY absent — audits créés mais emails non envoyés',
        }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Pour chaque audit avec email, envoyer via Resend
    for (const audit of pendingAudits ?? []) {
      if (!audit.contact_email) {
        emailsSkipped++
        continue
      }
      // @ts-expect-error — supabase-js typing limitation sur les joins
      const agenceName = (audit.brh_agences_immo?.nom_commercial as string | undefined) ?? null

      const html = buildAuditEmailHtml(audit.response_token, agenceName)
      const result = await sendResendEmail(
        resendKey,
        audit.contact_email,
        `BRH Habitat — votre retour sur le contact ${agenceName ?? ''}`.trim(),
        html,
      )

      if (result.ok) {
        await supa
          .from('brh_agence_audits')
          .update({
            email_sent_at: new Date().toISOString(),
            email_resend_id: result.id ?? null,
          })
          .eq('id', audit.id)
        emailsSent++
      } else {
        console.error(`Audit ${audit.id} send error:`, result.error)
        emailsFailed++
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        audit_month: auditMonth,
        audits_created: countCreated ?? 0,
        audits_with_email: pendingAudits?.length ?? 0,
        emails_sent: emailsSent,
        emails_skipped: emailsSkipped,
        emails_failed: emailsFailed,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('monthly-audit-agencies error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
