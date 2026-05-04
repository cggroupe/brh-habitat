/**
 * Edge Function : agence-prospect-study
 *
 * Renvoie l'étude énergétique complète d'un prospect DPE (scenarios S1/S2/S3,
 * aides MPR par décile, CEE, isolation détaillée, DVF, owner SCI) pour le
 * portail agence.
 *
 * Backend = simulateur BRH 8915 (FastAPI Python) qui calcule tout via BDNB
 * CSTB + 3CL + barèmes 2026.
 *
 * Sécurité :
 *   - Auth Bearer Supabase obligatoire
 *   - User doit avoir une charte agence active (brh_partner_contracts)
 *   - Rate limit 30/min/IP
 *
 * Body : { prospectId: number }
 * Returns : payload `/api/prospect/{id}` du simulateur 8915
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SIMULATEUR_URL = Deno.env.get('SIMULATEUR_BRH_URL') ?? 'http://147.93.52.70:8915'

interface RequestBody {
  prospectId: number
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: cors })

  // Rate limit
  const rl = checkRateLimit(req, 'agence-prospect-study', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  // Auth check
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentification requise' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Identify user
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const userId = userData.user.id

  // Check active agence membership
  const { data: contract } = await admin
    .from('brh_partner_contracts')
    .select('id, agence_id')
    .eq('signer_profile_id', userId)
    .eq('partner_type', 'agence_immo')
    .eq('status', 'active')
    .maybeSingle()

  if (!contract) {
    return new Response(
      JSON.stringify({ error: 'Aucune charte agence active' }),
      { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Body
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON invalide' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!body.prospectId || typeof body.prospectId !== 'number') {
    return new Response(JSON.stringify({ error: 'prospectId requis (number)' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Proxy vers simulateur 8915
  try {
    const res = await fetch(`${SIMULATEUR_URL}/api/prospect/${body.prospectId}`, {
      headers: { Accept: 'application/json' },
    })
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agence-prospect-study error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur backend simulateur', details: String(err) }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
