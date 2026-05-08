/**
 * Edge Function : dpe-express-create-lead
 *
 * Crée un brh_prospect depuis le diagnostic express (Phase 6.1).
 * Utilisable en mode anonyme (sans JWT) ou identifié.
 *
 * Anti-spam :
 * - Rate limit 3 req/min par IP
 * - Validation regex email/tel
 * - Service role pour bypass RLS d'INSERT (les anonymes ne peuvent pas
 *   normalement INSERT brh_prospects, donc on utilise le service role)
 *
 * Body : {
 *   firstName, lastName, phone, email?, address?, city?, postalCode?,
 *   workType: string[], estimatedBudgetEuros?, urgency?,
 *   notes?, // remplis avec le résumé du diagnostic
 *   diagnosticContext?: { etiquetteActuelle, etiquetteProjetee, ... } (pour notes)
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

interface RequestBody {
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  city?: string
  postalCode?: string
  workType: string[]
  estimatedBudgetEuros?: number
  urgency?: 'immediate' | '3mois' | '6mois' | 'plus'
  notes?: string
  diagnosticContext?: {
    etiquetteActuelle?: string
    etiquetteProjetee?: string
    cepActuel?: number
    cepProjete?: number
    coutTravauxTtc?: number
    aidesTotal?: number
    resteACharge?: number
  }
  /** Tracking attribution publicitaire (Phase F UX 08/05/2026). */
  attribution?: {
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    utm_content?: string | null
    utm_term?: string | null
    ref?: string | null
    gclid?: string | null
    fbclid?: string | null
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit anti-spam : 3 req/min par IP
  const rl = checkRateLimit(req, 'dpe-express-create-lead', { maxRequests: 3, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes — patientez 1 minute' }),
      { status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body: RequestBody = await req.json()

    // Validations
    if (!body.firstName || !body.lastName || !body.phone) {
      return new Response(
        JSON.stringify({ error: 'firstName, lastName, phone requis' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    // Téléphone FR (10 chiffres ou +33...)
    if (!/^(\+33|0)[1-9](\s?\d{2}){4}$/.test(body.phone.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ error: 'Téléphone invalide (format français)' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (!body.workType || !Array.isArray(body.workType) || body.workType.length === 0) {
      return new Response(
        JSON.stringify({ error: 'workType (array) requis' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Auth optionnelle : si JWT fourni, on lie via submitted_by
    const authHeader = req.headers.get('Authorization')
    let submittedBy: string | null = null
    if (authHeader?.startsWith('Bearer ') && authHeader.length > 20) {
      const token = authHeader.slice(7)
      const supaUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      )
      const { data: { user } } = await supaUser.auth.getUser()
      submittedBy = user?.id ?? null
    }

    // Service role pour INSERT (bypass RLS qui bloquerait les anonymes)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Construit notes à partir du contexte diagnostic
    let notesText = body.notes ?? ''
    if (body.diagnosticContext) {
      const c = body.diagnosticContext
      notesText = [
        notesText,
        '--- Diagnostic express ---',
        c.etiquetteActuelle ? `DPE actuel : ${c.etiquetteActuelle}${c.cepActuel ? ` (${Math.round(c.cepActuel)} kWh EP/m²·an)` : ''}` : null,
        c.etiquetteProjetee ? `DPE projeté : ${c.etiquetteProjetee}${c.cepProjete ? ` (${Math.round(c.cepProjete)} kWh EP/m²·an)` : ''}` : null,
        c.coutTravauxTtc ? `Coût travaux estimé : ${Math.round(c.coutTravauxTtc).toLocaleString('fr-FR')} € TTC` : null,
        c.aidesTotal ? `Aides estimées : ${Math.round(c.aidesTotal).toLocaleString('fr-FR')} €` : null,
        c.resteACharge ? `Reste à charge : ${Math.round(c.resteACharge).toLocaleString('fr-FR')} €` : null,
      ]
        .filter(Boolean)
        .join('\n')
    }
    // Tracking attribution publicitaire — append au notes pour visibilité immédiate admin BRH.
    // Permet de mesurer le ROI des campagnes Facebook Ads / Google Ads / affilié.
    if (body.attribution) {
      const a = body.attribution
      const lines = [
        a.utm_source ? `Source : ${a.utm_source}` : null,
        a.utm_medium ? `Medium : ${a.utm_medium}` : null,
        a.utm_campaign ? `Campagne : ${a.utm_campaign}` : null,
        a.utm_content ? `Contenu : ${a.utm_content}` : null,
        a.utm_term ? `Terme : ${a.utm_term}` : null,
        a.ref ? `Affilié : ${a.ref}` : null,
        a.gclid ? `Google Click ID : ${a.gclid}` : null,
        a.fbclid ? `Facebook Click ID : ${a.fbclid}` : null,
      ].filter(Boolean)
      if (lines.length > 0) {
        notesText = [notesText, '--- Attribution ---', ...lines].filter(Boolean).join('\n')
      }
    }

    // Lead score basé sur la qualité du contact
    let leadScore = 30 // base
    if (body.email) leadScore += 20
    if (body.address) leadScore += 15
    if (body.diagnosticContext?.coutTravauxTtc) leadScore += 20
    if (body.urgency === 'immediate') leadScore += 15
    else if (body.urgency === '3mois') leadScore += 10

    // INSERT brh_prospect
    const { data, error } = await supabase
      .from('brh_prospects')
      .insert({
        source_type: 'particulier',
        submitted_by: submittedBy,
        client_first_name: body.firstName.trim(),
        client_last_name: body.lastName.trim(),
        client_phone: body.phone.trim(),
        client_email: body.email?.trim() ?? null,
        client_address: body.address?.trim() ?? null,
        client_city: body.city?.trim() ?? null,
        client_postal_code: body.postalCode?.trim() ?? null,
        work_type: body.workType,
        estimated_budget: body.estimatedBudgetEuros
          ? `${Math.round(body.estimatedBudgetEuros).toLocaleString('fr-FR')} €`
          : null,
        urgency: body.urgency ?? '3mois',
        status: 'nouveau',
        notes: notesText.trim() || null,
        lead_score: leadScore,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Insert prospect failed:', error)
      return new Response(
        JSON.stringify({ error: 'Échec création lead', details: error.message }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, prospectId: data.id, leadScore, createdAt: data.created_at }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('dpe-express-create-lead error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne', details: String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
