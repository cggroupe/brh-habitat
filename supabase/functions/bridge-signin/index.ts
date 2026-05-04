/**
 * Bridge sign-in : echange un JWT Clerk contre une session Supabase.
 *
 * Flux :
 *  1. Client envoie son Clerk JWT (obtenu via getToken({ template: 'supabase' }))
 *  2. On valide la signature Clerk via JWKS
 *  3. On lit le Clerk user ID (sub) + email (claim custom)
 *  4. On cherche le user Supabase correspondant (via profiles.clerk_user_id)
 *  5. On genere un magic link token pour ce user Supabase et on le retourne
 *     sous forme de session access_token/refresh_token.
 *
 * Config requise (secrets Supabase) :
 *  - CLERK_ISSUER_URL : URL de l'issuer Clerk (ex: https://xxx.clerk.accounts.dev)
 *  - SUPABASE_SERVICE_ROLE_KEY : deja presente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { jwtVerify, createRemoteJWKSet } from 'https://esm.sh/jose@5.9.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CLERK_ISSUER = Deno.env.get('CLERK_ISSUER_URL') ?? '' // ex: https://related-minnow-68.clerk.accounts.dev

const JWKS = CLERK_ISSUER ? createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`)) : null

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  // Rate limit : 10 / IP / minute (auth bridge — sensible)
  const rl = checkRateLimit(req, 'bridge-signin', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de tentatives, réessayez dans une minute' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  if (!SUPABASE_URL || !SERVICE_KEY || !CLERK_ISSUER || !JWKS) {
    return new Response(JSON.stringify({ error: 'Config manquante (CLERK_ISSUER_URL / SERVICE_KEY)' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Token manquant' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })

  // Verifier le JWT Clerk
  let clerkUserId: string
  let email: string | null = null
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: CLERK_ISSUER })
    clerkUserId = payload.sub as string
    email = (payload.email as string | undefined) ?? null
    if (!clerkUserId) throw new Error('sub manquant dans le JWT')
  } catch (err) {
    return new Response(JSON.stringify({ error: 'JWT Clerk invalide', details: String(err).slice(0, 120) }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // Trouver le user Supabase via clerk_user_id
  let supaUserId: string | null = null
  const { data: profile } = await admin.from('profiles').select('id, email').eq('clerk_user_id', clerkUserId).maybeSingle()
  if (profile) {
    supaUserId = profile.id
    if (!email) email = profile.email
  } else if (email) {
    // Fallback : lookup par email (cas ou le webhook n'a pas encore sync ou user existant avant Clerk)
    // On liste paginated — pas ideal mais suffit pour un MVP
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
    const match = list?.users.find((u) => u.email === email)
    if (match) {
      supaUserId = match.id
      // Lier ce user au Clerk ID si pas deja fait
      await admin.from('profiles').update({ clerk_user_id: clerkUserId }).eq('id', match.id)
    }
  }

  // Si aucun user Supabase trouve : on le cree (cas race condition webhook pas encore fire)
  if (!supaUserId && email) {
    const randomPwd = crypto.randomUUID() + 'X!1'
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: randomPwd, email_confirm: true,
      user_metadata: { clerk_user_id: clerkUserId },
    })
    if (error || !created.user) {
      return new Response(JSON.stringify({ error: 'Creation user Supabase echouee', details: error?.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    supaUserId = created.user.id
    await admin.from('profiles').update({ clerk_user_id: clerkUserId }).eq('id', supaUserId)
  }

  if (!supaUserId || !email) {
    return new Response(JSON.stringify({ error: 'Impossible de bridger (email manquant dans JWT Clerk)' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Generer un magic link et extraire le token. On utilise generateLink(type='magiclink')
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkErr || !linkData.properties?.action_link) {
    return new Response(JSON.stringify({ error: 'generateLink echoue', details: linkErr?.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // action_link contient un token_hash qu'on peut echanger contre une session via verifyOtp
  const url = new URL(linkData.properties.action_link)
  const tokenHash = url.searchParams.get('token') || url.searchParams.get('token_hash')
  if (!tokenHash) {
    return new Response(JSON.stringify({ error: 'token_hash manquant dans le magic link' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Verifier le magic link cote user (anon) pour obtenir access/refresh token
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: sessionData, error: sessionErr } = await anonClient.auth.verifyOtp({
    type: 'magiclink', token_hash: tokenHash,
  })
  if (sessionErr || !sessionData.session) {
    return new Response(JSON.stringify({ error: 'verifyOtp echoue', details: sessionErr?.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user_id: supaUserId,
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
})
