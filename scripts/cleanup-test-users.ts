/**
 * Supprime tous les users de test crees par setup-test-users.ts
 * (emails en @brh-screenshot.internal).
 */

import { createClient } from '@supabase/supabase-js'
import { unlinkSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(__dirname, '.env.screenshots')

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lygmmvxnmvlgynmrcpny.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run(): Promise<void> {
  console.log('\n🧹 Cleanup users de test\n')

  // Passer par la table profiles (RLS bypass avec service_role) pour trouver les IDs
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email')
    .like('email', '%@brh-screenshot.internal')

  if (error) {
    console.error('❌ profiles query :', error.message)
    process.exit(1)
  }

  console.log(`  Trouve ${profiles?.length ?? 0} user(s) de test a supprimer`)

  for (const p of profiles ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(p.id)
    if (delErr) {
      console.error(`  ❌ ${p.email} : ${delErr.message}`)
    } else {
      console.log(`  ✅ Supprime : ${p.email}`)
    }
  }

  if (existsSync(ENV_FILE)) {
    unlinkSync(ENV_FILE)
    console.log(`\n  🗑  ${ENV_FILE} supprime`)
  }

  console.log(`\n✅ Cleanup termine\n`)
}

run().catch(err => {
  console.error('\n❌ Erreur :', err instanceof Error ? err.message : err)
  process.exit(1)
})
