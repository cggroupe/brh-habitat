/**
 * Edge Function : monthly-audit-agencies (Phase 16.0.9)
 *
 * Pipeline mensuel d'audit aléatoire des contacts agences.
 *
 * 1. Calcule le mois précédent (date_trunc month)
 * 2. Appelle le helper SQL `brh_generate_monthly_audits(audit_month)`
 *    qui sample 5 % des leads contactés et insère dans brh_agence_audits
 * 3. Pour chaque audit créé sans email_sent_at, envoie un email au
 *    propriétaire (si email connu) avec lien `/audit/:token` pour répondre
 *
 * Preview-safe : si RESEND_API_KEY absent, génère seulement les audits
 * sans envoi email (status='sent' avec email_sent_at NULL → admin peut
 * les traiter manuellement plus tard).
 *
 * Invocation : daily ou monthly via pg_cron, ou manuel par admin BRH.
 * Body : { audit_month?: 'YYYY-MM-01' }   (default: mois précédent)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  audit_month?: string // ISO date YYYY-MM-01
}

function getPreviousMonthFirst(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Pas de rate limit : invoqué par cron + admin uniquement (vérif token)
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

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Génère les audits via le helper SQL (idempotent)
    const { data: countCreated, error: rpcErr } = await supa.rpc(
      'brh_generate_monthly_audits',
      { p_audit_month: auditMonth },
    )
    if (rpcErr) throw rpcErr

    // 2. Récupère les audits sans email_sent_at pour ce mois
    const { data: pendingAudits, error: listErr } = await supa
      .from('brh_agence_audits')
      .select('id, prospect_id, response_token, contact_email')
      .eq('audit_month', auditMonth)
      .is('email_sent_at', null)
    if (listErr) throw listErr

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const emailsSent = 0
    let emailsSkipped = 0

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          ok: true,
          audit_month: auditMonth,
          audits_created: countCreated ?? 0,
          emails_sent: 0,
          warning: 'RESEND_API_KEY absent — audits créés mais emails non envoyés',
        }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Pour chaque audit, fetch l'email du prospect + envoie
    for (const audit of pendingAudits ?? []) {
      try {
        // Fetch email du prospect (présent dans brh_dpe_prospects.client_email
        // ou dérivé via une jointure agence_contact si pas direct)
        const { data: prospect } = await supa
          .from('brh_dpe_prospects')
          .select('id, commune, code_postal')
          .eq('id', audit.prospect_id)
          .maybeSingle()

        if (!prospect) {
          emailsSkipped++
          continue
        }

        // Pour MVP : on n'a pas l'email du proprio dans brh_dpe_prospects
        // (anonymisé). On marque l'audit en "ready" pour traitement manuel
        // par BRH avec l'email récupéré par d'autres canaux.
        // En prod : brh_proprietaires (table à ajouter Phase 16.x) avec emails.
        await supa
          .from('brh_agence_audits')
          .update({
            email_sent_at: null,
            status: 'sent',
          })
          .eq('id', audit.id)

        emailsSkipped++
      } catch (err) {
        console.error('Audit email error:', err)
        emailsSkipped++
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        audit_month: auditMonth,
        audits_created: countCreated ?? 0,
        emails_sent: emailsSent,
        emails_skipped: emailsSkipped,
        note:
          'Phase 16.0.9 MVP : audits generes en DB mais emails proprios reportes '
          + 'jusqu a la table brh_proprietaires (Phase 16.x future).',
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
