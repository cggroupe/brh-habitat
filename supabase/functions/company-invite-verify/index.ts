/**
 * company-invite-verify : endpoint PUBLIC qui valide un token d'invitation.
 *
 * Utilise par JoinCompanyPage pour afficher "Vous etes invite par <X> a rejoindre <Y>"
 * avant que l'user fasse signup.
 *
 * POST { token } -> { valid, company_name, email, inviter_name, expires_at }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  // Rate limit anti-bruteforce : 30 verifs/min/IP
  const rl = checkRateLimit(req, 'invite-verify', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ valid: false, error: 'Trop de tentatives' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let token: string
  try {
    const body = await req.json()
    token = String(body.token ?? '').trim()
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'JSON invalide' }), { status: 400, headers: cors })
  }
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    return new Response(JSON.stringify({ valid: false, error: 'Token invalide' }), { status: 400, headers: cors })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: inv } = await admin
    .from('brh_company_invitations')
    .select('id, company_id, invited_by, email, member_role, expires_at, accepted_at, brh_companies:company_id(name)')
    .eq('token', token)
    .maybeSingle()

  if (!inv) {
    return new Response(JSON.stringify({ valid: false, error: 'Invitation introuvable' }), { status: 404, headers: cors })
  }
  if (inv.accepted_at) {
    return new Response(JSON.stringify({ valid: false, error: 'Cette invitation a deja ete acceptee' }), { status: 409, headers: cors })
  }
  if (new Date(inv.expires_at as string) < new Date()) {
    return new Response(JSON.stringify({ valid: false, error: 'Invitation expiree (7 jours max). Demandez un nouveau lien.' }), { status: 410, headers: cors })
  }

  const { data: inviter } = await admin.from('profiles').select('full_name').eq('id', inv.invited_by as string).maybeSingle()
  type CompanyRef = { name: string } | { name: string }[] | null
  const rel = inv.brh_companies as CompanyRef
  const companyName = Array.isArray(rel) ? (rel[0]?.name ?? 'Entreprise') : (rel?.name ?? 'Entreprise')

  return new Response(JSON.stringify({
    valid: true,
    invitation_id: inv.id,
    company_name: companyName,
    email: inv.email,
    inviter_name: inviter?.full_name ?? 'Votre partenaire',
    expires_at: inv.expires_at,
    member_role: inv.member_role,
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
})
