/**
 * Edge Function : notify-artisan-lead
 *
 * Phase 13.6.3 — Email auto à l'artisan quand un pro RGE lui recommande un prospect.
 *
 * Flow :
 *   1. Pro RGE crée un lead via Phase 13.6.2 (RecommendArtisanModal)
 *   2. Le front appelle cette EF avec { leadId }
 *   3. EF charge artisan + prospect + pro recommandeur
 *   4. Compose email HTML avec contexte complet (DPE, MPR éligibles, geste)
 *   5. Envoie via Resend
 *   6. Marque le lead `status = 'pending'` (déjà par défaut) + log timestamp `responded_at = null`
 *
 * Body : { leadId: string }
 * Returns : { sent: true, resendId: '...' }
 *
 * Rate limit : 10/min/IP (cohérent avec send-notification-email).
 *
 * Variables : RESEND_API_KEY + EMAIL_FROM (défaut noreply@brh-habitat.fr).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@brh-habitat.fr'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.renovation-brh.fr'

interface RequestBody {
  leadId: string
}

interface LeadRow {
  id: string
  artisan_id: string
  prospect_id: number
  geste: string
  estimated_chantier_ttc_eur: number | null
  expected_commission_eur: number | null
  recommended_by: string | null
}

interface ArtisanRow {
  id: string
  nom_entreprise: string
  representant: string | null
  email: string | null
  commune: string | null
}

interface ProspectRow {
  id: number
  etiquette_dpe: string | null
  etiquette_ges: string | null
  adresse_ban: string | null
  code_postal: string | null
  commune: string | null
  surface_habitable: number | null
  conso_m2_ep: number | null
  cout_energie_annuel: number | null
  energie_chauffage: string | null
  mpr_bleu_total: number | null
  mpr_jaune_total: number | null
  mpr_violet_total: number | null
  cee_total: number | null
}

const GESTES_LABELS: Record<string, string> = {
  pac_air_eau: 'Pompe à chaleur air-eau',
  pac_eau_eau: 'PAC eau-eau (géothermie)',
  pac_air_air: 'PAC air-air',
  isolation_combles_perdus: 'Isolation combles perdus',
  isolation_combles_amenages: 'Isolation combles aménagés',
  isolation_murs_ite: 'Isolation murs extérieure (ITE)',
  isolation_murs_iti: 'Isolation murs intérieure (ITI)',
  isolation_plancher_bas: 'Isolation plancher bas',
  fenetres_double_vitrage: 'Fenêtres double vitrage',
  fenetres_triple_vitrage: 'Fenêtres triple vitrage',
  porte_isolante: 'Porte isolante',
  vmc_double_flux: 'VMC double flux',
  vmc_simple_flux: 'VMC simple flux',
  chauffage_bois_buche: 'Chauffage bois bûche',
  chauffage_bois_granules: 'Chauffage granulés',
  chauffage_solaire: 'Chauffage solaire',
  chauffe_eau_solaire: 'Chauffe-eau solaire',
  chauffe_eau_thermodynamique: 'Chauffe-eau thermodynamique',
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

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '–'
  return `${Math.round(n).toLocaleString('fr-FR')} €`
}

function buildEmailHtml(
  artisan: ArtisanRow,
  prospect: ProspectRow,
  geste: string,
  proName: string,
  estimatedChantier: number | null,
): string {
  const gesteLabel = GESTES_LABELS[geste] ?? geste

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouveau lead BRH Habitat</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f3f2; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937;">
  <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 24px 32px; background: linear-gradient(135deg, #1c7b1d 0%, #094114 100%); color: #ffffff;">
        <div style="font-size: 24px; font-weight: bold;">🔧 Nouveau lead BRH Habitat</div>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">Bonjour ${escapeHtml(artisan.representant ?? artisan.nom_entreprise)},</div>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px 32px;">
        <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
          <strong>${escapeHtml(proName)}</strong>, auditeur RGE BRH Habitat, vous recommande un nouveau prospect pour&nbsp;:
        </p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <div style="font-size: 18px; font-weight: bold; color: #92400e;">${escapeHtml(gesteLabel)}</div>
          ${
            estimatedChantier
              ? `<div style="font-size: 13px; color: #78350f; margin-top: 4px;">Chantier estimé : <strong>${formatEur(estimatedChantier)}</strong> TTC</div>`
              : ''
          }
        </div>

        <h2 style="font-size: 16px; color: #1c7b1d; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px;">📍 Adresse du prospect</h2>
        <p style="font-size: 14px; line-height: 1.6; margin: 8px 0;">
          ${escapeHtml(prospect.adresse_ban ?? '–')}<br>
          ${escapeHtml(prospect.code_postal ?? '')} ${escapeHtml(prospect.commune ?? '')}
        </p>

        <h2 style="font-size: 16px; color: #1c7b1d; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px;">🏠 Caractéristiques du logement</h2>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 50%;">Étiquette DPE</td>
            <td style="padding: 6px 0; text-align: right;">
              <span style="display: inline-block; padding: 2px 8px; background: ${prospect.etiquette_dpe === 'F' ? '#fb923c' : '#dc2626'}; color: white; border-radius: 4px; font-weight: bold;">${escapeHtml(prospect.etiquette_dpe ?? '?')}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Étiquette GES</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(prospect.etiquette_ges ?? '?')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Surface habitable</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${prospect.surface_habitable ? `${Math.round(prospect.surface_habitable)} m²` : '–'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Consommation</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${prospect.conso_m2_ep ? `${Math.round(prospect.conso_m2_ep)} kWh/m²·an` : '–'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Énergie chauffage</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(prospect.energie_chauffage ?? '?')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Coût énergie annuel</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatEur(prospect.cout_energie_annuel)}</td>
          </tr>
        </table>

        <h2 style="font-size: 16px; color: #1c7b1d; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px;">💰 Aides MaPrimeRénov' éligibles</h2>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">MPR Bleu (très modeste)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #2563eb;">${formatEur(prospect.mpr_bleu_total)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">MPR Jaune (modeste)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #ca8a04;">${formatEur(prospect.mpr_jaune_total)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">MPR Violet (intermédiaire)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #9333ea;">${formatEur(prospect.mpr_violet_total)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">CEE (Certificats Économie Énergie)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">${formatEur(prospect.cee_total)}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding: 16px; background: #ecfccb; border-radius: 6px;">
          <p style="font-size: 14px; margin: 0 0 8px; color: #365314;">
            <strong>📞 Action recommandée</strong> — Contactez le prospect dans les 48h pour maximiser vos chances de signature.
          </p>
          <p style="font-size: 12px; margin: 0; color: #4d7c0f;">
            BRH commission ${prospect.mpr_bleu_total ? '5-10' : '5'} % du chantier final, payée mensuellement après réception facture.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="${SITE_URL}/pro/mes-leads-artisans" style="display: inline-block; padding: 12px 24px; background: #1c7b1d; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
            Voir le détail dans mon espace BRH
          </a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding: 16px 32px; background: #f5f3f2; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb;">
        BRH Habitat — Bretagne Rénovation Habitat<br>
        Cabinet RGE QualiBat conforme arrêté 8 octobre 2021<br>
        <a href="${SITE_URL}" style="color: #1c7b1d;">renovation-brh.fr</a>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'notify-artisan-lead', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Resend non configuré',
          message: 'RESEND_API_KEY absent — contactez l\'admin.',
        }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const body: RequestBody = await req.json()
    if (!body.leadId) {
      return new Response(JSON.stringify({ error: 'leadId requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Auth user (le pro qui a créé le lead)
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

    // 1. Charge le lead
    const { data: lead, error: lErr } = await supa
      .from('brh_artisan_leads')
      .select('id,artisan_id,prospect_id,geste,estimated_chantier_ttc_eur,expected_commission_eur,recommended_by')
      .eq('id', body.leadId)
      .single<LeadRow>()
    if (lErr || !lead) {
      return new Response(JSON.stringify({ error: 'Lead introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 2. Charge artisan + prospect + nom du pro recommandeur en parallèle
    const [artisanRes, prospectRes, profileRes] = await Promise.all([
      supa
        .from('brh_artisans_rge')
        .select('id,nom_entreprise,representant,email,commune')
        .eq('id', lead.artisan_id)
        .single<ArtisanRow>(),
      supa
        .from('brh_dpe_prospects')
        .select('id,etiquette_dpe,etiquette_ges,adresse_ban,code_postal,commune,surface_habitable,conso_m2_ep,cout_energie_annuel,energie_chauffage,mpr_bleu_total,mpr_jaune_total,mpr_violet_total,cee_total')
        .eq('id', lead.prospect_id)
        .single<ProspectRow>(),
      lead.recommended_by
        ? supa.from('profiles').select('full_name').eq('id', lead.recommended_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (artisanRes.error || !artisanRes.data) {
      return new Response(JSON.stringify({ error: 'Artisan introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (prospectRes.error || !prospectRes.data) {
      return new Response(JSON.stringify({ error: 'Prospect introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const artisan = artisanRes.data
    const prospect = prospectRes.data
    const proName =
      ((profileRes.data ?? null) as { full_name?: string } | null)?.full_name ??
      'Auditeur RGE BRH Habitat'

    if (!artisan.email) {
      return new Response(
        JSON.stringify({
          error: 'Artisan sans email',
          message: 'Cet artisan n\'a pas d\'email enregistré, contact direct uniquement.',
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Compose et envoie l'email Resend
    const html = buildEmailHtml(
      artisan,
      prospect,
      lead.geste,
      proName,
      lead.estimated_chantier_ttc_eur,
    )
    const subject = `🔧 Nouveau lead BRH Habitat — ${prospect.commune ?? 'Bretagne'} (DPE ${prospect.etiquette_dpe ?? '?'})`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `BRH Habitat <${EMAIL_FROM}>`,
        to: [artisan.email],
        subject,
        html,
        reply_to: ((profileRes.data ?? null) as { email?: string } | null)?.email,
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

    return new Response(
      JSON.stringify({
        sent: true,
        resendId: resendData.id,
        to: artisan.email,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('notify-artisan-lead error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
