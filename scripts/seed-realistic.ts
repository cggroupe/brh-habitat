/**
 * Seed massif de donnees realistes sur Supabase prod.
 * Cree : 15 pros + entreprises, 25 affilies particuliers, 50 prospects,
 *        20 devis signes, points, messages, notifications.
 *
 * Tous visibles dans /admin/partenaires, /admin/prospects, /admin/commissions,
 * /admin/messages.
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lygmmvxnmvlgynmrcpny.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant'); process.exit(1) }

const db = createClient(SUPABASE_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// ─── Donnees francaises realistes ───────────────────────────────────────────
const FIRST_NAMES_M = ['Jean', 'Pierre', 'Nicolas', 'Thomas', 'Lucas', 'Hugo', 'Louis', 'Antoine', 'Gabriel', 'Nathan', 'Maxime', 'Julien', 'Romain', 'Kevin', 'Alexandre']
const FIRST_NAMES_F = ['Marie', 'Sophie', 'Camille', 'Julie', 'Emma', 'Lea', 'Chloe', 'Sarah', 'Marion', 'Laura', 'Anais', 'Manon', 'Clara', 'Ines', 'Juliette']
const LAST_NAMES = ['Le Gall', 'Kerveillant', 'Le Goff', 'Tanguy', 'Dupont', 'Martin', 'Bernard', 'Moreau', 'Laurent', 'Lefebvre', 'Simon', 'Rousseau', 'Lambert', 'Fournier', 'Morel', 'Girard', 'Bonnet', 'Dumont', 'Lopez', 'Andre', 'Lemaire', 'Faure', 'Guillaume', 'Henry', 'Blanchard']
const CITIES = [
  { name: 'Brest', cp: '29200' }, { name: 'Rennes', cp: '35000' },
  { name: 'Quimper', cp: '29000' }, { name: 'Vannes', cp: '56000' },
  { name: 'Lorient', cp: '56100' }, { name: 'Saint-Brieuc', cp: '22000' },
  { name: 'Guipavas', cp: '29490' }, { name: 'Lannion', cp: '22300' },
  { name: 'Fougeres', cp: '35300' }, { name: 'Douarnenez', cp: '29100' },
  { name: 'Concarneau', cp: '29900' }, { name: 'Auray', cp: '56400' },
  { name: 'Morlaix', cp: '29600' }, { name: 'Landerneau', cp: '29800' },
  { name: 'Pontivy', cp: '56300' },
]
const COMPANY_SUFFIXES = ['SARL', 'SAS', 'EURL', 'Conseil', 'Immo', 'Habitat', 'Renovation', 'Services', 'Expertise', 'Partners']
const COMPANY_PREFIXES = ['Bretagne', 'Armor', 'Atlantique', 'Iroise', 'Finistere', 'Ocean', 'Celtic', 'Korrigan', 'Menhir', 'Kerne']
const PROFESSIONS = ['architecte', 'agent_immobilier', 'maitre_oeuvre', 'courtier', 'autre'] as const
const DOMAINS = ['gmail.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'outlook.fr', 'hotmail.fr']
const WORK_TYPES = ['toiture', 'isolation', 'menuiseries', 'ravalement', 'electricite', 'plomberie', 'chauffage', 'vmc', 'renovation_globale']
const URGENCIES = ['immediate', '3mois', '6mois', 'plus'] as const

// ─── Helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr]; const out: T[] = []
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function slugify(s: string): string { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') }
function makeSiret(): string { return Array.from({ length: 14 }, () => randInt(0, 9)).join('') }
function makePhone(): string {
  const prefixes = ['0298', '0299', '0297', '0296', '0294', '0602', '0603', '0607', '0612', '0645']
  return pick(prefixes) + Array.from({ length: 6 }, () => randInt(0, 9)).join('')
}
function makePassword(): string { return randomBytes(9).toString('base64').replace(/[+/=]/g, '') + '!A1' }
function makeReferralCode(): string { return Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[randInt(0, 30)]).join('') }

interface User { id: string; email: string; password: string; fullName: string; role: 'admin' | 'pro' | 'particulier' }

async function createUser(role: 'pro' | 'particulier', index: number): Promise<User> {
  const isMale = Math.random() > 0.5
  const firstName = pick(isMale ? FIRST_NAMES_M : FIRST_NAMES_F)
  const lastName = pick(LAST_NAMES)
  const fullName = `${firstName} ${lastName}`
  const base = `${slugify(firstName)}.${slugify(lastName)}`
  const email = `${base}${randInt(10, 999)}@${pick(DOMAINS)}`
  const password = makePassword()

  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, role, phone: makePhone() },
  })
  if (error || !data.user) throw new Error(`createUser[${role}#${index}]: ${error?.message}`)

  const city = pick(CITIES)
  const { error: upErr } = await db.from('profiles').update({
    role, full_name: fullName, phone: makePhone(),
    locale: 'fr', is_active: true,
  }).eq('id', data.user.id)
  if (upErr) console.warn(`  profile update ${role}#${index} : ${upErr.message}`)

  return { id: data.user.id, email, password, fullName, role }
}

async function main(): Promise<void> {
  const report = { pros: [] as User[], proCompanies: [] as {companyId: string; ownerId: string; name: string}[], affiliates: [] as (User & {affiliateId: string; referralCode: string; points: number})[], prospects: 0, quotes: 0, transactions: 0, messages: 0, notifications: 0, errors: [] as string[] }

  console.log('\n🌱 Seed realistic data BRH Habitat\n')

  // ─── 1. Clients particuliers (role=particulier basic, pas affilie) ────────
  console.log('━━━ 10 clients particuliers ━━━')
  const clients: User[] = []
  for (let i = 0; i < 10; i++) {
    try {
      const u = await createUser('particulier', i)
      clients.push(u)
      console.log(`  ✅ ${u.fullName} (${u.email})`)
    } catch (err) {
      const msg = String(err).slice(0, 80)
      console.log(`  ❌ client#${i} : ${msg}`)
      report.errors.push(`client#${i}: ${msg}`)
    }
  }

  // ─── 2. Pros avec entreprises ─────────────────────────────────────────────
  console.log('\n━━━ 15 pros + entreprises ━━━')
  for (let i = 0; i < 15; i++) {
    try {
      const u = await createUser('pro', i)
      const city = pick(CITIES)
      const profession = pick(PROFESSIONS)
      const companyName = `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`
      const level = i < 3 ? 'platinum' : i < 6 ? 'gold' : i < 10 ? 'silver' : 'bronze'
      const commissionRate = level === 'platinum' ? 8 : level === 'gold' ? 6 : level === 'silver' ? 4 : 2
      const totalCa = level === 'platinum' ? randInt(15000000, 30000000) : level === 'gold' ? randInt(5000000, 15000000) : level === 'silver' ? randInt(1000000, 5000000) : randInt(0, 1000000)

      const { data: company, error: cErr } = await db.from('brh_companies').insert({
        owner_id: u.id, name: companyName, siret: makeSiret(),
        address: `${randInt(1, 99)} rue de ${pick(['la Paix', 'Bretagne', 'l\'Ocean', 'la Liberte', 'Kervao', 'du Port'])}`,
        city: city.name, postal_code: city.cp,
        profession, commission_rate_percent: commissionRate,
        level, total_ca_apporte: totalCa, is_active: true,
      }).select().single()
      if (cErr) throw new Error(`company: ${cErr.message}`)

      await db.from('brh_company_members').insert({
        company_id: company.id, profile_id: u.id, member_role: 'owner',
      })

      report.pros.push(u)
      report.proCompanies.push({ companyId: company.id, ownerId: u.id, name: companyName })
      console.log(`  ✅ ${u.fullName} → ${companyName} [${level}, ${(totalCa/100).toLocaleString('fr-FR')}€ CA]`)
    } catch (err) {
      const msg = String(err).slice(0, 80)
      console.log(`  ❌ pro#${i} : ${msg}`)
      report.errors.push(`pro#${i}: ${msg}`)
    }
  }

  // ─── 3. Affilies particuliers ─────────────────────────────────────────────
  console.log('\n━━━ 25 affilies particuliers ━━━')
  for (let i = 0; i < 25; i++) {
    try {
      const u = await createUser('particulier', 100 + i)
      const points = i < 4 ? randInt(2000, 5000) : i < 10 ? randInt(800, 1800) : i < 18 ? randInt(300, 800) : randInt(0, 300)
      const level = points >= 1500 ? 'vip' : points >= 700 ? 'expert' : points >= 300 ? 'ambassadeur' : 'standard'
      const referralCode = makeReferralCode()

      // Le trigger handle_new_user auto-cree brh_affiliates avec BRH-XXXX.
      // On fait donc UPDATE pour forcer nos valeurs (points, level, code custom).
      const { data: aff, error: aErr } = await db.from('brh_affiliates').update({
        referral_code: referralCode,
        points_balance: points, total_points_earned: points + randInt(0, 500),
        level,
      }).eq('id', u.id).select().single()
      if (aErr) throw new Error(`affiliate: ${aErr.message}`)

      report.affiliates.push({ ...u, affiliateId: aff.id, referralCode, points })
      console.log(`  ✅ ${u.fullName} [${level}, ${points} pts, code=${referralCode}]`)
    } catch (err) {
      const msg = String(err).slice(0, 80)
      console.log(`  ❌ affiliate#${i} : ${msg}`)
      report.errors.push(`affiliate#${i}: ${msg}`)
    }
  }

  // ─── 4. Prospects (50, repartis entre pros et affilies) ───────────────────
  console.log('\n━━━ 50 prospects ━━━')
  const statusWeights: Array<[string, number]> = [
    ['nouveau', 0.3], ['etude', 0.2], ['devis_envoye', 0.2],
    ['signe', 0.15], ['termine', 0.1], ['perdu', 0.05],
  ]
  function pickStatus(): string {
    const r = Math.random(); let acc = 0
    for (const [s, w] of statusWeights) { acc += w; if (r < acc) return s }
    return 'nouveau'
  }

  const prospectsCreated: Array<{ id: string; status: string; sourceType: 'pro' | 'particulier'; companyId?: string; affiliateId?: string; commissionRate?: number }> = []

  for (let i = 0; i < 50; i++) {
    try {
      const isPro = Math.random() < 0.5
      const city = pick(CITIES)
      const clientFirst = pick([...FIRST_NAMES_M, ...FIRST_NAMES_F])
      const clientLast = pick(LAST_NAMES)
      const work = pickN(WORK_TYPES, randInt(1, 3))
      const status = pickStatus()

      const payload: Record<string, unknown> = {
        source_type: isPro ? 'pro' : 'particulier',
        client_first_name: clientFirst, client_last_name: clientLast,
        client_phone: makePhone(),
        client_email: `${slugify(clientFirst)}.${slugify(clientLast)}${randInt(10,99)}@${pick(DOMAINS)}`,
        client_address: `${randInt(1, 99)} rue ${pick(['de Bretagne', 'du Port', 'Victor Hugo', 'Jean Jaures', 'des Korrigans'])}`,
        client_city: city.name, client_postal_code: city.cp,
        work_type: work, estimated_budget: pick([500000, 1500000, 2500000, 4000000, 7500000, 12000000]),
        urgency: pick(URGENCIES), status,
        notes: pick(['Client motive, a deja un DPE', 'Demande devis rapide', 'Vu en salon bati', 'Recommandation voisin', 'Projet sur 3 mois']),
        lead_score: randInt(20, 95),
      }
      if (isPro && report.proCompanies.length) {
        const comp = pick(report.proCompanies)
        payload.company_id = comp.companyId
        payload.submitted_by = comp.ownerId
      } else if (!isPro && report.affiliates.length) {
        const aff = pick(report.affiliates)
        payload.affiliate_id = aff.affiliateId
        payload.submitted_by = aff.id
      }

      const { data, error } = await db.from('brh_prospects').insert(payload).select().single()
      if (error) throw new Error(error.message)

      prospectsCreated.push({
        id: data.id, status, sourceType: data.source_type,
        companyId: data.company_id ?? undefined, affiliateId: data.affiliate_id ?? undefined,
        commissionRate: isPro ? (report.proCompanies.find(c => c.companyId === data.company_id) ? randInt(2, 8) : undefined) : undefined,
      })
      report.prospects++
      if (i % 10 === 9) console.log(`  Progress : ${i + 1}/50`)
    } catch (err) {
      const msg = String(err).slice(0, 80)
      report.errors.push(`prospect#${i}: ${msg}`)
    }
  }
  console.log(`  ✅ ${report.prospects} prospects crees`)

  // ─── 5. Devis signes pour les prospects status=signe/termine ──────────────
  console.log('\n━━━ Devis signes + commissions ━━━')
  const signedProspects = prospectsCreated.filter(p => p.status === 'signe' || p.status === 'termine')
  for (const p of signedProspects) {
    try {
      const amount = randInt(500000, 8000000) // 5k a 80k euros en centimes
      const rate = p.commissionRate ?? randInt(2, 8)
      const commission = Math.round(amount * rate / 100)
      const daysAgo = randInt(10, 90)
      const signedAt = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)

      const { error } = await db.from('brh_quotes').insert({
        prospect_id: p.id, amount, signed_at: signedAt,
        payment_method: pick(['virement', 'cheque']),
        commission_rate_percent: rate, commission_amount: commission,
        commission_status: pick(['en_attente', 'validee', 'versee']),
        points_awarded: p.sourceType === 'particulier' ? 100 : 0,
        points_awarded_at: p.sourceType === 'particulier' ? new Date().toISOString() : null,
        notes: 'Devis cree par seed automatique',
      })
      if (error) throw new Error(error.message)
      report.quotes++
    } catch (err) {
      report.errors.push(`quote: ${String(err).slice(0, 80)}`)
    }
  }
  console.log(`  ✅ ${report.quotes} devis signes avec commissions`)

  // ─── 6. Transactions points pour les affilies ─────────────────────────────
  console.log('\n━━━ Transactions points ━━━')
  for (const aff of report.affiliates) {
    const nb = randInt(2, 8)
    for (let i = 0; i < nb; i++) {
      try {
        const type = pick(['parrainage', 'bonus_mensuel', 'echange_cadeau', 'ajustement_admin'] as const)
        const points = type === 'echange_cadeau' ? -randInt(100, 500) : randInt(50, 300)
        const { error } = await db.from('brh_points_transactions').insert({
          affiliate_id: aff.affiliateId, points, type,
          description: type === 'parrainage' ? 'Parrainage devis signe' : type === 'bonus_mensuel' ? 'Bonus mensuel 3+ parrainages' : type === 'echange_cadeau' ? 'Echange bon cadeau Amazon 50€' : 'Ajustement equipe BRH',
        })
        if (error) throw new Error(error.message)
        report.transactions++
      } catch (err) {
        report.errors.push(`transaction: ${String(err).slice(0, 60)}`)
      }
    }
  }
  console.log(`  ✅ ${report.transactions} transactions points`)

  // ─── 7. Messages (threads + messages entre affilies/pros et admin) ────────
  console.log('\n━━━ Messages et threads ━━━')
  const allUsers = [...report.pros.map(p => ({ ...p, type: 'pro' as const })), ...report.affiliates.map(a => ({ ...a, type: 'particulier' as const }))]
  const subjects = [
    'Question sur les commissions',
    'Demande d\'information paiement',
    'Probleme connexion compte',
    'Invitation evenement',
    'Bienvenue sur la plateforme',
    'Nouveau filleul inscrit',
    'Mise a jour niveau partenaire',
    'Rappel declaration mensuelle',
  ]
  for (let i = 0; i < 30; i++) {
    try {
      const u = pick(allUsers)
      const { data: thread, error: tErr } = await db.from('brh_message_threads').insert({
        subject: pick(subjects), participant_id: u.id,
        participant_type: u.type, is_archived: Math.random() < 0.15,
      }).select().single()
      if (tErr) throw new Error(tErr.message)

      const nbMessages = randInt(1, 4)
      for (let j = 0; j < nbMessages; j++) {
        await db.from('brh_messages').insert({
          thread_id: thread.id,
          sender_id: j % 2 === 0 ? u.id : null, // alternance user/admin
          body: pick([
            'Bonjour, j\'aurais besoin d\'une information.',
            'Merci pour votre retour, je vais verifier.',
            'Le paiement est bien parti, vous devriez le voir d\'ici 48h.',
            'Pouvez-vous me donner plus de details ?',
            'Parfait, tout est clair. Merci.',
            'Je vais soumettre un nouveau prospect cette semaine.',
            'N\'hesitez pas si vous avez d\'autres questions.',
          ]),
          is_read: Math.random() > 0.3,
        })
        report.messages++
      }
    } catch (err) {
      report.errors.push(`thread: ${String(err).slice(0, 60)}`)
    }
  }
  console.log(`  ✅ ${report.messages} messages sur 30 threads`)

  // ─── 8. Notifications ─────────────────────────────────────────────────────
  console.log('\n━━━ Notifications ━━━')
  for (const u of allUsers.slice(0, 30)) {
    try {
      const nb = randInt(2, 5)
      for (let i = 0; i < nb; i++) {
        await db.from('brh_notifications').insert({
          recipient_id: u.id,
          type: pick(['nouveau_prospect', 'statut_prospect', 'devis_signe', 'commission_versee', 'points_gagnes', 'nouveau_message']),
          title: pick(['Nouveau prospect', 'Devis signe !', 'Commission versee', '+100 points', 'Nouveau message', 'Niveau debloque']),
          body: pick(['Un client vient de s\'inscrire via votre code', 'Felicitations, votre dernier prospect a signe le devis', 'Virement effectue sur votre compte', 'Vous venez de gagner 100 points', 'Vous avez un nouveau message', 'Vous etes maintenant Ambassadeur']),
          is_read: Math.random() > 0.5,
        })
        report.notifications++
      }
    } catch (err) {
      report.errors.push(`notification: ${String(err).slice(0, 60)}`)
    }
  }
  console.log(`  ✅ ${report.notifications} notifications`)

  // ─── Rapport final ────────────────────────────────────────────────────────
  const summary = {
    clients: clients.length,
    pros: report.pros.length,
    affiliates: report.affiliates.length,
    prospects: report.prospects,
    quotes: report.quotes,
    transactions: report.transactions,
    messages: report.messages,
    notifications: report.notifications,
    errors: report.errors.length,
  }

  console.log('\n═══════════════════════════════════════')
  console.log('📊 RAPPORT FINAL')
  console.log('═══════════════════════════════════════')
  console.table(summary)
  if (report.errors.length > 0) {
    console.log(`\n⚠️  ${report.errors.length} erreurs :`)
    report.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
    if (report.errors.length > 10) console.log(`  ... (+ ${report.errors.length - 10} autres)`)
  }

  // Ecrire credentials dans un fichier pour stress-test
  const credsFile = join(__dirname, '.seed-credentials.json')
  writeFileSync(credsFile, JSON.stringify({
    pros: report.pros.map(p => ({ email: p.email, password: p.password, fullName: p.fullName })),
    affiliates: report.affiliates.map(a => ({ email: a.email, password: a.password, fullName: a.fullName, referralCode: a.referralCode })),
    clients: clients.map(c => ({ email: c.email, password: c.password, fullName: c.fullName })),
  }, null, 2), { mode: 0o600 })
  console.log(`\n💾 Credentials sauvegardees dans ${credsFile}`)
  console.log('\n✅ Seed termine ! Connecte-toi sur /admin pour voir tout.\n')
}

main().catch(err => { console.error('\n❌ Fatal :', err); process.exit(1) })
