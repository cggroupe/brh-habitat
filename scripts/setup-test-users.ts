/**
 * Crée 3 comptes de test Supabase (admin, pro, particulier) via Admin API,
 * puis écrit les credentials dans scripts/.env.screenshots pour le script
 * de capture automatique.
 *
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npm run setup-test-users
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ENV = join(__dirname, '.env.screenshots')

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lygmmvxnmvlgynmrcpny.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = process.env.BASE_URL ?? 'https://brh-habitat.vercel.app'

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant.')
  console.error('   Exemple : SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run setup-test-users')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Role = 'admin' | 'pro' | 'particulier'

function makePassword(): string {
  return randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16) + '!A1'
}

async function createTestUser(role: Role, index: number): Promise<{ email: string; password: string }> {
  const email = `test-${role}-${Date.now()}-${index}@brh-screenshot.internal`
  const password = makePassword()
  const full_name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)} Screenshot`

  console.log(`  👤 Creation ${role} : ${email}`)

  // 1. Creer l'utilisateur auth
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })
  if (userErr || !userData.user) {
    throw new Error(`Creation auth user ${role} a echoue : ${userErr?.message}`)
  }

  const userId = userData.user.id

  // 2. Forcer le role dans profiles (le trigger handle_new_user l'a cree mais peut etre en 'user')
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ role, full_name })
    .eq('id', userId)

  if (profileErr) {
    console.warn(`     ⚠️  Update profile (${role}) : ${profileErr.message}`)
  }

  // 3. Pour particulier, creer aussi l'entree affiliate
  if (role === 'particulier') {
    const referralCode = `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const { error: affErr } = await admin.from('brh_affiliates').insert({
      profile_id: userId,
      referral_code: referralCode,
      level: 'standard',
      points_balance: 1500, // quelques points pour voir le catalogue actif
    })
    if (affErr) {
      console.warn(`     ⚠️  Creation affiliate : ${affErr.message}`)
    }
  }

  console.log(`     ✅ OK (id=${userId.slice(0, 8)}...)`)
  return { email, password }
}

async function run(): Promise<void> {
  console.log('\n🔧 Setup users de test Supabase\n')

  const adminCreds = await createTestUser('admin', 1)
  const proCreds = await createTestUser('pro', 2)
  const partCreds = await createTestUser('particulier', 3)

  const envContent = [
    `# Genere automatiquement par setup-test-users.ts — ${new Date().toISOString()}`,
    `# A supprimer via 'npm run cleanup-test-users' apres usage.`,
    '',
    `BASE_URL=${BASE_URL}`,
    '',
    `ADMIN_EMAIL=${adminCreds.email}`,
    `ADMIN_PASSWORD=${adminCreds.password}`,
    '',
    `PRO_EMAIL=${proCreds.email}`,
    `PRO_PASSWORD=${proCreds.password}`,
    '',
    `PART_EMAIL=${partCreds.email}`,
    `PART_PASSWORD=${partCreds.password}`,
    '',
  ].join('\n')

  writeFileSync(OUT_ENV, envContent, { mode: 0o600 })
  console.log(`\n✅ Credentials ecrites dans ${OUT_ENV}`)
  console.log(`\n▶  Lance maintenant : npm run screenshots`)
  console.log(`▶  Puis cleanup :     npm run cleanup-test-users\n`)
}

run().catch(err => {
  console.error('\n❌ Erreur :', err instanceof Error ? err.message : err)
  process.exit(1)
})
