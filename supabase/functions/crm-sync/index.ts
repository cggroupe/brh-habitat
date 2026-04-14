import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const CRM_API_URL = Deno.env.get('CRM_API_URL') ?? ''
const CRM_API_KEY = Deno.env.get('CRM_API_KEY') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Rate limit : 5 req/min par IP
  const rl = checkRateLimit(req, 'crm-sync', { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requetes' }),
      { status: 429, headers: { ...getCorsHeaders(req), ...rl.headers, 'Content-Type': 'application/json' } },
    )
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acces reserve aux admins' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const { prospect_id } = await req.json()

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: 'prospect_id requis' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Recuperer le prospect complet
    const { data: prospect, error: fetchError } = await supabase
      .from('brh_prospects')
      .select('*')
      .eq('id', prospect_id)
      .single()

    if (fetchError || !prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect introuvable' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    if (!CRM_API_URL || !CRM_API_KEY) {
      console.warn('CRM_API_URL ou CRM_API_KEY non configure — sync ignoree')
      return new Response(
        JSON.stringify({ warning: 'CRM non configure', prospect_id }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // Mapper vers le format CRM BRH
    const crmPayload = {
      source: prospect.source_type === 'pro' ? 'partenaire' : 'parrainage',
      client: {
        first_name: prospect.client_first_name,
        last_name: prospect.client_last_name,
        phone: prospect.client_phone,
        email: prospect.client_email,
        address: prospect.client_address,
        city: prospect.client_city,
        postal_code: prospect.client_postal_code,
      },
      work_types: prospect.work_type,
      estimated_budget: prospect.estimated_budget,
      urgency: prospect.urgency,
      notes: prospect.notes,
      lead_score: prospect.lead_score,
      partner_platform_id: prospect.id,
    }

    // Envoi vers le CRM avec retry (3 tentatives, backoff exponentiel)
    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${CRM_API_URL}/api/prospects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CRM_API_KEY}`,
          },
          body: JSON.stringify(crmPayload),
          signal: AbortSignal.timeout(30_000),
        })

        if (response.ok) {
          const crmData = await response.json()

          // Stocker l'ID CRM dans le prospect
          const { error: updateError } = await supabase
            .from('brh_prospects')
            .update({
              crm_id: crmData.id ?? crmData.prospect_id ?? null,
              crm_synced_at: new Date().toISOString(),
            })
            .eq('id', prospect_id)

          if (updateError) {
            console.error('Failed to mark prospect as synced:', updateError)
          }

          return new Response(
            JSON.stringify({ success: true, crm_id: crmData.id }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
          )
        }

        lastError = new Error(`CRM HTTP ${response.status}: ${await response.text()}`)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }

      // Backoff exponentiel : 1s, 2s, 4s
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }

    console.error('CRM sync echouee apres 3 tentatives:', lastError?.message)
    return new Response(
      JSON.stringify({ error: 'CRM sync echouee', details: lastError?.message }),
      { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('crm-sync error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
