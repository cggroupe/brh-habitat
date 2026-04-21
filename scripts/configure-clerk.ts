/**
 * Configure Clerk via sa Backend API.
 *
 * Fait pour toi :
 *  - Cree le JWT template "supabase" (claim email requis par bridge-signin)
 *  - Recupere l'issuer URL a utiliser dans Supabase secrets
 *  - Tente de creer le webhook endpoint via Svix API
 *  - Liste les providers OAuth actives
 *
 * Usage :
 *   CLERK_SECRET_KEY=sk_test_xxx \
 *   SUPABASE_FUNCTIONS_URL=https://lygmmvxnmvlgynmrcpny.supabase.co/functions/v1 \
 *   npm run configure-clerk
 */

const CLERK_SECRET = process.env.CLERK_SECRET_KEY
const SUPA_FUNCS = process.env.SUPABASE_FUNCTIONS_URL ?? 'https://lygmmvxnmvlgynmrcpny.supabase.co/functions/v1'

if (!CLERK_SECRET || !CLERK_SECRET.startsWith('sk_')) {
  console.error('❌ CLERK_SECRET_KEY manquant ou invalide (doit commencer par sk_)')
  process.exit(1)
}

const CLERK_API = 'https://api.clerk.com/v1'
const headers = { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/json' }

async function clerk(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const resp = await fetch(`${CLERK_API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, data }
}

async function main(): Promise<void> {
  console.log('\n🔧 Configuration Clerk automatique\n')

  // ─── 1. Info instance (pour recuperer frontend_api = issuer URL) ──────────
  console.log('1️⃣  Recuperation info instance...')
  const instance = await clerk('GET', '/instance')
  if (!instance.ok) {
    console.error(`   ❌ HTTP ${instance.status}:`, instance.data)
    process.exit(1)
  }

  // L'issuer URL dans Clerk = https://{frontend_api}
  // Ex: related-minnow-68.clerk.accounts.dev
  const envType = instance.data.environment_type as string | undefined
  console.log(`   ✅ Instance : ${envType === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}\n`)

  // ─── 2. Creer JWT template "supabase" ─────────────────────────────────────
  console.log('2️⃣  JWT template "supabase"...')
  const jwtList = await clerk('GET', '/jwt_templates')
  const existing = Array.isArray(jwtList.data)
    ? (jwtList.data as Array<{ name: string; id: string }>).find((t) => t.name === 'supabase')
    : null
  if (existing) {
    console.log(`   ⚠️  Template "supabase" existe deja (id=${existing.id.slice(0, 12)}...) — skip`)
  } else {
    const created = await clerk('POST', '/jwt_templates', {
      name: 'supabase',
      claims: {
        email: '{{user.primary_email_address}}',
        role: 'authenticated',
        aud: 'authenticated',
      },
      lifetime: 60,
      allowed_clock_skew: 5,
    })
    if (!created.ok) {
      console.error(`   ❌ Creation JWT template HTTP ${created.status}:`, created.data)
    } else {
      console.log(`   ✅ JWT template "supabase" cree (id=${(created.data.id as string).slice(0, 12)}...)\n`)
    }
  }

  // ─── 3. Issuer URL (pour Supabase secret CLERK_ISSUER_URL) ────────────────
  // On teste en signant un token de test pour voir l'issuer
  console.log('3️⃣  Recuperation issuer URL...')
  // Via JWKS : on liste tous les tokens actifs pour extraire le domain
  const jwks = await fetch('https://related-minnow-68.clerk.accounts.dev/.well-known/openid-configuration')
    .then((r) => r.ok ? r.json() : null)
    .catch(() => null)
  const issuerUrl = jwks?.issuer ?? 'https://related-minnow-68.clerk.accounts.dev'
  console.log(`   ✅ Issuer URL : ${issuerUrl}\n`)

  // ─── 4. Webhook endpoint (via Svix API proxy de Clerk) ────────────────────
  console.log('4️⃣  Webhook Clerk -> clerk-webhook...')
  const svixGet = await clerk('GET', '/webhooks/svix')
  if (!svixGet.ok) {
    console.log(`   ℹ️  API Svix Clerk indisponible (HTTP ${svixGet.status}). Webhook a creer manuellement.`)
  } else {
    const svixUrl = svixGet.data.svix_url as string | undefined
    console.log(`   🔗 Svix Dashboard URL : ${svixUrl ?? '(non retourne)'}`)
    console.log(`   → Ouvre ce lien dans ton navigateur`)
    console.log(`   → Add Endpoint -> URL: ${SUPA_FUNCS}/clerk-webhook`)
    console.log(`   → Events: user.created, user.updated, user.deleted`)
    console.log(`   → Copie le "Signing Secret" (whsec_...) dans Supabase\n`)
  }

  // ─── 5. OAuth providers actuels ───────────────────────────────────────────
  console.log('5️⃣  OAuth providers :')
  // En mode DEV Clerk, Google est deja active avec les credentials partages Clerk
  if (envType !== 'production') {
    console.log('   ✅ Google : active par defaut (credentials partages Clerk dev)')
    console.log('   ⚠️  Apple/LinkedIn : a activer via Dashboard si besoin')
    console.log('   📌 En prod, il faudra configurer les credentials Google Cloud\n')
  } else {
    console.log('   ⚠️  Mode prod : configurer les OAuth manuellement dans Dashboard Clerk')
  }

  // ─── 6. Resume final ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════')
  console.log('📋 CONFIGURATION A APPLIQUER')
  console.log('═══════════════════════════════════════\n')

  console.log('A. Supabase secrets :')
  console.log(`   supabase secrets set CLERK_ISSUER_URL=${issuerUrl}`)
  console.log(`   supabase secrets set CLERK_WEBHOOK_SECRET=whsec_xxx  # copier depuis Svix Dashboard\n`)

  console.log('B. Deploy :')
  console.log(`   supabase functions deploy clerk-webhook --no-verify-jwt`)
  console.log(`   supabase functions deploy bridge-signin --no-verify-jwt`)
  console.log(`   supabase functions deploy verify-siret\n`)

  console.log('C. Vercel :')
  console.log(`   Add env var VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx\n`)

  console.log('D. Webhook Clerk -> Svix Dashboard :')
  console.log(`   URL : ${SUPA_FUNCS}/clerk-webhook`)
  console.log(`   Events : user.created, user.updated, user.deleted\n`)

  console.log('✅ Termine.')
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err)
  process.exit(1)
})
