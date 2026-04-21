/**
 * Webhook Clerk -> Supabase sync.
 *
 * Reçoit les evenements user.created / user.updated / user.deleted depuis Clerk
 * et maintient une copie miroir dans auth.users + profiles Supabase.
 *
 * Le user a donc DEUX identifiants :
 *  - Clerk user ID (stocke dans profiles.clerk_user_id)
 *  - Supabase auth user UUID (stocke dans profiles.id)
 *
 * Ça permet de garder toutes les RLS existantes basees sur auth.uid() intactes.
 *
 * Config :
 *  - Le secret `CLERK_WEBHOOK_SECRET` doit etre set via supabase secrets set
 *  - Dans Clerk Dashboard : Webhooks > Add Endpoint > pointer vers cette function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { Webhook } from 'https://esm.sh/svix@1.38.0'
import { getCorsHeaders } from '../_shared/cors.ts'

const WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface ClerkEmailAddress { email_address: string; id: string; verification?: { status: string } }
interface ClerkUser {
  id: string
  email_addresses: ClerkEmailAddress[]
  primary_email_address_id: string | null
  first_name: string | null
  last_name: string | null
  phone_numbers?: Array<{ phone_number: string }>
  public_metadata?: Record<string, unknown>
  unsafe_metadata?: Record<string, unknown>
  image_url?: string
}

interface ClerkEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string
  data: ClerkUser
}

function primaryEmail(u: ClerkUser): string | null {
  const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id)
  return primary?.email_address ?? u.email_addresses[0]?.email_address ?? null
}

function fullName(u: ClerkUser): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || primaryEmail(u) || 'Utilisateur'
}

function inferredRole(u: ClerkUser): 'user' | 'particulier' | 'pro' {
  const meta = u.unsafe_metadata ?? u.public_metadata ?? {}
  const role = meta.role
  if (role === 'pro' || role === 'particulier') return role
  return 'particulier' // defaut : nouveau user = affilie potentiel
}

async function handleUserCreated(admin: ReturnType<typeof createClient>, u: ClerkUser): Promise<void> {
  const email = primaryEmail(u)
  if (!email) throw new Error('Aucun email primaire sur le user Clerk')

  // 1. Verifier s'il existe deja un auth.user avec cet email (cas migration)
  const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 1 })
  const existing = existingList?.users.find((x) => x.email === email)

  let authUserId: string
  if (existing) {
    authUserId = existing.id
    // Mettre a jour son metadata avec le clerk_user_id
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, clerk_user_id: u.id, full_name: fullName(u) },
    })
  } else {
    // 2. Creer un nouvel auth.user (password aleatoire impossible a utiliser, c'est Clerk qui auth)
    const randomPwd = crypto.randomUUID() + 'X!1'
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: randomPwd, email_confirm: true,
      user_metadata: { clerk_user_id: u.id, full_name: fullName(u), role: inferredRole(u) },
    })
    if (error || !created.user) throw new Error(`Create auth user: ${error?.message}`)
    authUserId = created.user.id
  }

  // 3. Le trigger handle_new_user cree profiles automatiquement, mais on s'assure
  //    que clerk_user_id + les infos Clerk sont bien injectes
  await admin.from('profiles').update({
    clerk_user_id: u.id, full_name: fullName(u),
    phone: u.phone_numbers?.[0]?.phone_number ?? null,
    avatar_url: u.image_url ?? null,
  }).eq('id', authUserId)
}

async function handleUserUpdated(admin: ReturnType<typeof createClient>, u: ClerkUser): Promise<void> {
  const email = primaryEmail(u)
  if (!email) return

  // Trouver le user Supabase via clerk_user_id
  const { data: profile } = await admin.from('profiles').select('id').eq('clerk_user_id', u.id).maybeSingle()
  if (!profile) return handleUserCreated(admin, u) // pas encore sync, on cree

  await admin.from('profiles').update({
    email, full_name: fullName(u),
    phone: u.phone_numbers?.[0]?.phone_number ?? null,
    avatar_url: u.image_url ?? null,
  }).eq('id', profile.id)

  // Sync email cote auth.users aussi
  await admin.auth.admin.updateUserById(profile.id, { email })
}

async function handleUserDeleted(admin: ReturnType<typeof createClient>, u: ClerkUser): Promise<void> {
  const { data: profile } = await admin.from('profiles').select('id').eq('clerk_user_id', u.id).maybeSingle()
  if (!profile) return
  // Soft-delete : marquer is_active = false. Supprimer physiquement ferait cascade sur 20+ tables
  await admin.from('profiles').update({ is_active: false }).eq('id', profile.id)
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  if (!WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Config manquante (CLERK_WEBHOOK_SECRET / SERVICE_KEY)' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  // Verifier la signature Svix (Clerk utilise Svix pour ses webhooks)
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: 'Headers Svix manquants' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const body = await req.text()
  let evt: ClerkEvent
  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    evt = wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature }) as ClerkEvent
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Signature invalide', details: String(err).slice(0, 100) }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    switch (evt.type) {
      case 'user.created': await handleUserCreated(admin, evt.data); break
      case 'user.updated': await handleUserUpdated(admin, evt.data); break
      case 'user.deleted': await handleUserDeleted(admin, evt.data); break
      default: /* autres evenements ignores */ break
    }
    return new Response(JSON.stringify({ ok: true, type: evt.type }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(`[clerk-webhook] ${evt.type}:`, err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
