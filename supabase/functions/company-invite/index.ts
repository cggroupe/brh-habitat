/**
 * company-invite : un owner cree une invitation pour rejoindre sa company pro.
 *
 * Flow :
 *   1. L'owner est authentifie via Supabase (session Clerk-bridged ou Supabase direct)
 *   2. POST { email, member_role } depuis UI /pro/equipe
 *   3. On verifie qu'il est bien owner de sa company
 *   4. Genere un token aleatoire, INSERT dans brh_company_invitations
 *   5. Envoie email via Resend avec lien /inscription/pro/rejoindre?token=xxx
 *
 * Secrets requis : RESEND_API_KEY, EMAIL_FROM, APP_URL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'noreply@contact-brh.fr'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://brh-habitat.vercel.app'

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendInvitationEmail(to: string, companyName: string, inviterName: string, link: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[company-invite] RESEND_API_KEY non configure, email skip')
    return false
  }
  const html = `
    <!DOCTYPE html>
    <html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1c7b1d; font-size: 28px; margin: 0;">BRH Habitat</h1>
        <p style="color: #6b7280; margin-top: 8px;">Reseau breton de la renovation</p>
      </div>
      <div style="background: #f5f5f0; border-radius: 16px; padding: 30px;">
        <h2 style="color: #1B1C1C; margin-top: 0;">Vous avez ete invite a rejoindre ${companyName}</h2>
        <p style="color: #374151; line-height: 1.6;">
          <strong>${inviterName}</strong> vous invite a rejoindre son equipe sur la plateforme partenaire BRH Habitat.
        </p>
        <p style="color: #374151; line-height: 1.6;">
          En tant que collaborateur, vous pourrez suivre les prospects et commissions de l'entreprise,
          consulter les outils BRH (chiffrage IA, assistant technique, reseaux sociaux) et utiliser la
          plateforme comme l'equipe.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="display: inline-block; background: #1c7b1d; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
            Accepter l'invitation
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          Ce lien est valable 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p>BRH Habitat — Bretagne Renovation Habitat<br>35 rue de Kervao, 29490 Guipavas</p>
      </div>
    </body></html>
  `.trim()

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: EMAIL_FROM, to,
        subject: `${inviterName} vous invite a rejoindre ${companyName} sur BRH Habitat`,
        html,
      }),
    })
    if (!resp.ok) {
      console.error('[company-invite] Resend error:', resp.status, await resp.text())
      return false
    }
    return true
  } catch (err) {
    console.error('[company-invite] fetch Resend:', err)
    return false
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  // Rate limit anti-spam : 10 invitations/minute/user
  const rl = checkRateLimit(req, 'company-invite', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop d\'invitations, patientez 1 minute' }), {
      status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  // Auth : verifier que l'user est authentifie via le JWT Supabase (session cree par bridge-signin)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Auth requise' }), { status: 401, headers: cors })

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Session invalide' }), { status: 401, headers: cors })
  }

  let body: { email?: string; member_role?: 'owner' | 'member' }
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400, headers: cors }) }

  const email = body.email?.trim().toLowerCase()
  const memberRole = body.member_role ?? 'member'
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 400, headers: cors })
  }
  if (memberRole !== 'member' && memberRole !== 'owner') {
    return new Response(JSON.stringify({ error: 'Role invalide' }), { status: 400, headers: cors })
  }

  // Verifier que le user est owner d'une company (via service role pour bypass RLS ambigue)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: membership } = await admin.from('brh_company_members')
    .select('company_id, brh_companies:company_id(id, name)')
    .eq('profile_id', user.id)
    .eq('member_role', 'owner')
    .maybeSingle()
  if (!membership) {
    return new Response(JSON.stringify({ error: 'Vous devez etre proprietaire d\'une entreprise pour inviter' }), { status: 403, headers: cors })
  }
  const companyId = membership.company_id as string
  type CompanyRef = { id: string; name: string } | { id: string; name: string }[] | null
  const rel = membership.brh_companies as CompanyRef
  const companyName = Array.isArray(rel) ? (rel[0]?.name ?? 'Entreprise') : (rel?.name ?? 'Entreprise')

  // Nom de l'inviter
  const { data: inviterProfile } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const inviterName = inviterProfile?.full_name ?? 'Votre partenaire'

  // Generer token + INSERT
  const inviteToken = randomToken()
  const { data: invitation, error: insErr } = await admin.from('brh_company_invitations').insert({
    company_id: companyId, invited_by: user.id, email, member_role: memberRole, token: inviteToken,
  }).select().single()
  if (insErr) {
    return new Response(JSON.stringify({ error: `Creation invitation: ${insErr.message}` }), { status: 500, headers: cors })
  }

  // Envoyer l'email (pas bloquant : si email fail, invitation reste valide)
  const link = `${APP_URL}/inscription/pro/rejoindre?token=${inviteToken}`
  const emailSent = await sendInvitationEmail(email, companyName, inviterName, link)

  return new Response(JSON.stringify({
    ok: true, invitation_id: invitation.id, email_sent: emailSent, link,
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
})
