/**
 * Edge Function : submit-optout (Phase 16.0.4)
 *
 * Réception d'une demande RGPD opt-out depuis la page publique /opt-out.
 * Pas d'authentification requise (Art. 21 RGPD : faciliter l'opposition).
 *
 * - Insert dans brh_optout_requests (RLS anon allowed)
 * - Capture source_ip + user_agent comme preuve
 * - Tente un match sur brh_dpe_prospects via code_postal + commune (best-effort)
 * - Envoi email de confirmation au demandeur (Resend si configuré, sinon noop)
 * - Rate limit 5 / IP / heure (anti-spam)
 *
 * Body :
 * {
 *   email: string,                              // requis
 *   request_type: 'opposition'|'suppression'|'rectification',
 *   adresse?: string,
 *   code_postal?: string,
 *   commune?: string,
 *   message?: string
 * }
 *
 * Returns : { ok: true, request_id: uuid, deadline: ISO date }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

interface RequestBody {
  email?: string
  request_type?: 'opposition' | 'suppression' | 'rectification'
  adresse?: string
  code_postal?: string
  commune?: string
  message?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function clampStr(s: string | undefined, max: number): string | null {
  if (!s) return null
  const t = s.trim()
  return t ? t.slice(0, max) : null
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit anti-spam : 5 requêtes / IP / heure
  const rl = checkRateLimit(req, 'submit-optout', { maxRequests: 5, windowSeconds: 3600 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }),
      { status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))

    if (!body.email || !isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const requestType = body.request_type ?? 'opposition'
    if (!['opposition', 'suppression', 'rectification'].includes(requestType)) {
      return new Response(
        JSON.stringify({ error: 'Type de demande invalide' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Capture IP + user-agent (preuve eIDAS-like)
    const sourceIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null
    const userAgent = req.headers.get('user-agent') ?? null

    // Best-effort match : trouver un prospect via code_postal + commune
    let matchedProspectId: number | null = null
    if (body.code_postal && body.commune) {
      const { data: match } = await supa
        .from('brh_dpe_prospects')
        .select('id')
        .eq('code_postal', body.code_postal)
        .ilike('commune', body.commune)
        .limit(1)
        .maybeSingle()
      matchedProspectId = (match?.id as number | undefined) ?? null
    }

    const { data: inserted, error } = await supa
      .from('brh_optout_requests')
      .insert({
        email: body.email.trim().toLowerCase(),
        request_type: requestType,
        adresse: clampStr(body.adresse, 500),
        code_postal: clampStr(body.code_postal, 5),
        commune: clampStr(body.commune, 100),
        message: clampStr(body.message, 2000),
        source_ip: sourceIp,
        source_user_agent: clampStr(userAgent, 500),
        matched_prospect_id: matchedProspectId,
      })
      .select('id, deadline')
      .single()

    if (error) {
      console.error('submit-optout insert error:', error)
      return new Response(
        JSON.stringify({ error: 'Erreur d\'enregistrement, veuillez réessayer.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Best-effort : email de confirmation via Resend si configuré
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'BRH Habitat <noreply@renovation-brh.fr>',
            to: body.email,
            subject: 'Confirmation de votre demande de suppression de données',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1c7b1d;">Demande enregistrée</h1>
                <p>Bonjour,</p>
                <p>Nous avons bien reçu votre demande de <strong>${requestType}</strong> RGPD concernant les données collectées par Bretagne Rénovation Habitat.</p>
                <p><strong>Numéro de référence :</strong> ${inserted.id}</p>
                <p><strong>Délai légal de traitement :</strong> 30 jours, soit avant le ${new Date(inserted.deadline).toLocaleDateString('fr-FR')}.</p>
                <p>Conformément à l'article 21 du RGPD, vous serez retiré de notre base de scoring ainsi que de tout démarchage commercial nous concernant.</p>
                <p>Cordialement,<br/>L'équipe Bretagne Rénovation Habitat</p>
                <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;"/>
                <p style="font-size: 12px; color: #6b7280;">
                  35 rue de Kervao · 29490 Guipavas · 02 19 00 53 05<br/>
                  Cet email confirme la réception de votre demande. Aucune action de votre part n'est requise.
                </p>
              </div>
            `,
          }),
        })
      } catch (e) {
        console.error('Resend confirmation email failed (non-bloquant):', e)
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        request_id: inserted.id,
        deadline: inserted.deadline,
      }),
      { headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('submit-optout error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
