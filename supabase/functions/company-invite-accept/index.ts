/**
 * company-invite-accept : user authentifie accepte une invitation.
 *
 * POST { token } avec Authorization: Bearer <supabase_jwt>
 *  - Verifie que l'invitation est valide + non expiree + non acceptee
 *  - Verifie que l'email du user = email invite (securite : on veut pas qu'un
 *    attaquant prenne un token d'autrui)
 *  - INSERT dans brh_company_members
 *  - UPDATE brh_company_invitations SET accepted_at, accepted_by
 *  - Retourne { ok: true, company_id, redirect: '/pro' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Auth requise' }), { status: 401, headers: cors })
  }

  let token: string
  try {
    const body = await req.json()
    token = String(body.token ?? '').trim()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400, headers: cors })
  }
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 400, headers: cors })
  }

  // Recuperer l'user authentifie
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Session invalide' }), { status: 401, headers: cors })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // Lire l'invitation
  const { data: inv } = await admin.from('brh_company_invitations')
    .select('id, company_id, email, member_role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()
  if (!inv) {
    return new Response(JSON.stringify({ error: 'Invitation introuvable' }), { status: 404, headers: cors })
  }
  if (inv.accepted_at) {
    return new Response(JSON.stringify({ error: 'Invitation deja acceptee' }), { status: 409, headers: cors })
  }
  if (new Date(inv.expires_at as string) < new Date()) {
    return new Response(JSON.stringify({ error: 'Invitation expiree' }), { status: 410, headers: cors })
  }

  // Securite : l'user connecte doit correspondre a l'email invite
  const { data: userProfile } = await admin.from('profiles').select('email').eq('id', user.id).maybeSingle()
  const userEmail = (userProfile?.email ?? user.email ?? '').toLowerCase()
  if (userEmail !== (inv.email as string).toLowerCase()) {
    return new Response(JSON.stringify({
      error: `Cette invitation est destinee a ${inv.email}. Deconnectez-vous et creez un compte avec cet email.`,
    }), { status: 403, headers: cors })
  }

  // INSERT dans company_members (ON CONFLICT DO NOTHING si deja membre)
  const { error: memErr } = await admin.from('brh_company_members').insert({
    company_id: inv.company_id,
    profile_id: user.id,
    member_role: inv.member_role,
  })
  if (memErr && !memErr.message.toLowerCase().includes('duplicate')) {
    return new Response(JSON.stringify({ error: `Ajout au membre: ${memErr.message}` }), { status: 500, headers: cors })
  }

  // Marquer l'invitation comme acceptee
  await admin.from('brh_company_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', inv.id as string)

  return new Response(JSON.stringify({
    ok: true, company_id: inv.company_id, redirect: '/pro',
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
})
