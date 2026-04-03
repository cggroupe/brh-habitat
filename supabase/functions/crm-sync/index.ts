import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const CRM_API_URL = Deno.env.get('CRM_API_URL') ?? ''
const CRM_API_KEY = Deno.env.get('CRM_API_KEY') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { prospect_id } = await req.json()

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: 'prospect_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!CRM_API_URL || !CRM_API_KEY) {
      console.warn('CRM_API_URL ou CRM_API_KEY non configure — sync ignoree')
      return new Response(
        JSON.stringify({ warning: 'CRM non configure', prospect_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        })

        if (response.ok) {
          const crmData = await response.json()

          // Stocker l'ID CRM dans le prospect
          await supabase
            .from('brh_prospects')
            .update({
              crm_id: crmData.id ?? crmData.prospect_id ?? null,
              crm_synced_at: new Date().toISOString(),
            })
            .eq('id', prospect_id)

          return new Response(
            JSON.stringify({ success: true, crm_id: crmData.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('crm-sync error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
