/**
 * Phase 16.0.7 — Page onboarding agence immobilière.
 *
 * Workflow 5 étapes :
 *   1. SIRET → auto-fetch SIRENE (EF verify-siret existante)
 *   2. Représentant + email + fonction
 *   3. Choix tier (4 cards : Discovery 0€ / Standard 390€ / Premium 990€ / Expert 2490€)
 *   4. Lecture charte Markdown + 3 consentements
 *   5. Signature (compte BRH créé + agence + subscription + contrat) + redirect /agence
 *
 * Pour MVP démo : signature auto-active (status='active'). En prod, statut
 * pending_email + token 2FA à confirmer (Phase 16.0.7b futur).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader,
  AlertCircle,
  Lock,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/lib/supabase'
import {
  buildCharteVariables,
  generateCharteContent,
  CHARTE_ENGAGEMENTS_RESUME,
} from '@/lib/charte-agence'
import {
  TIER_LABELS,
  TIER_PRICES,
  TIER_QUOTAS,
  type AgenceTier,
} from '@/api/agence-subscriptions'

type Step = 1 | 2 | 3 | 4 | 5

interface SiretData {
  raison_sociale: string
  siret: string
  adresse?: string
  code_postal?: string
  commune?: string
  departement?: string
}

interface RepData {
  full_name: string
  email: string
  password: string
  telephone: string
  role: string
}

const TIER_FEATURES: Record<AgenceTier, string[]> = {
  discovery: ['5 leads / mois', 'Score Vente v1', 'Anti-doublon 30j', 'Email support'],
  standard: ['30 leads / mois', 'Filtrage avancé', 'Export CSV', 'Priorité support'],
  premium: ['100 leads / mois', 'Alertes nouveaux leads', 'Dashboard analytics', 'SLA 24h'],
  expert: ['Leads illimités', 'API directe', 'Support dédié', 'Compte manager'],
}

export default function InscriptionAgencePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lien de parrainage `?ref=<agence_id>` — récupéré au mount
  const referrerAgenceId = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    return ref && /^[0-9a-f-]{36}$/i.test(ref) ? ref : null
  }, [])

  const [siret, setSiret] = useState('')
  const [siretData, setSiretData] = useState<SiretData | null>(null)

  const [rep, setRep] = useState<RepData>({
    full_name: '',
    email: '',
    password: '',
    telephone: '',
    role: 'Gérant',
  })

  const [tier, setTier] = useState<AgenceTier>('discovery')

  const [consents, setConsents] = useState({
    consent_terms: false,
    consent_data: false,
    consent_communications: false,
  })

  const charteContent = siretData
    ? generateCharteContent(
        buildCharteVariables(
          {
            raison_sociale: siretData.raison_sociale,
            siret: siretData.siret,
            adresse: siretData.adresse,
          },
          { full_name: rep.full_name, email: rep.email, role: rep.role },
          tier,
        ),
      )
    : ''

  async function handleSiretLookup() {
    setError(null)
    if (!/^\d{14}$/.test(siret)) {
      setError('Le SIRET doit contenir exactement 14 chiffres.')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: efErr } = await supabase.functions.invoke<{
        legal_name?: string
        address?: string
        postal_code?: string
        city?: string
      }>('verify-siret', { body: { siret } })
      if (efErr) throw efErr
      if (!data?.legal_name) {
        setError('SIRET non trouvé dans la base SIRENE. Vérifiez le numéro.')
        return
      }
      setSiretData({
        raison_sociale: data.legal_name,
        siret,
        adresse: data.address,
        code_postal: data.postal_code,
        commune: data.city,
        departement: data.postal_code?.slice(0, 2),
      })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur SIRENE')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitFinal() {
    setError(null)
    if (!siretData) return

    if (!Object.values(consents).every((v) => v)) {
      setError('Vous devez accepter les 3 engagements pour signer.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Crée le compte Supabase Auth
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: rep.email,
        password: rep.password,
        options: {
          data: { full_name: rep.full_name, role: 'pro' }, // pro est le UserRole pour l'instant
        },
      })
      if (signupErr) throw signupErr
      if (!signupData.user) throw new Error('Création compte échouée')
      const userId = signupData.user.id

      // 2. Crée la fiche agence_immo (status='partenaire' immédiat car charte signée)
      //    Si l'utilisateur est arrivé via un lien de parrainage `?ref=<agence_id>`,
      //    on capture l'agence parrain → trigger SQL crée la commission auto.
      const { data: agence, error: agenceErr } = await supabase
        .from('brh_agences_immo')
        .insert({
          siret: siretData.siret,
          raison_sociale: siretData.raison_sociale,
          representant: rep.full_name,
          email: rep.email,
          telephone: rep.telephone,
          adresse: siretData.adresse,
          code_postal: siretData.code_postal,
          commune: siretData.commune,
          departement: siretData.departement,
          status: 'partenaire',
          referred_by_agence_id: referrerAgenceId,
        })
        .select('id')
        .single()
      if (agenceErr) throw agenceErr

      // 3. Crée le contrat signé
      const { error: contractErr } = await supabase.from('brh_partner_contracts').insert({
        partner_type: 'agence_immo',
        agence_id: agence.id,
        signer_profile_id: userId,
        signer_full_name: rep.full_name,
        signer_email: rep.email,
        signer_role: rep.role,
        template_version: 'v1.0',
        contract_content: charteContent,
        consent_terms: consents.consent_terms,
        consent_data: consents.consent_data,
        consent_communications: consents.consent_communications,
        signature_user_agent: navigator.userAgent,
        // MVP : auto-active. Prod : pending_email + token + EF email 2FA
        status: 'active',
        email_confirmed_at: new Date().toISOString(),
      })
      if (contractErr) throw contractErr

      // 4. Crée la subscription (tier choisi, quota auto via trigger DB)
      const { error: subErr } = await supabase.from('brh_agence_subscriptions').insert({
        agence_id: agence.id,
        signer_profile_id: userId,
        tier,
      })
      if (subErr) throw subErr

      setStep(5)
      // Redirect vers /agence après 2 secondes
      setTimeout(() => navigate('/agence'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 mb-4">
            <Building2 className="text-blue-600" size={32} />
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Devenir agence partenaire BRH
          </h1>
          <p className="text-gray-600 mt-2 max-w-xl mx-auto">
            Accédez aux leads scorés F/G de Bretagne. Modèle Hoguet "A" :
            fiches d'opportunité, pas de transaction directe.
          </p>
        </header>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s < 5 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <CheckCircle2 size={14} /> : s}
              </div>
              {s < 5 ? (
                <div
                  className={`flex-1 h-0.5 mx-1 transition ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-light p-6 lg:p-8">
          {/* STEP 1 — SIRET */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Étape 1 — Votre agence</h2>
              <p className="text-sm text-gray-600">
                Saisissez le SIRET de votre agence pour récupérer automatiquement
                vos informations légales depuis la base SIRENE.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="14 chiffres"
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {siret.length} / 14 caractères
                </p>
              </div>
              {error ? (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              ) : null}
              <button
                onClick={handleSiretLookup}
                disabled={submitting || siret.length !== 14}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader className="animate-spin" size={16} /> : null}
                {submitting ? 'Vérification SIRENE…' : 'Vérifier le SIRET'}
              </button>
            </div>
          )}

          {/* STEP 2 — Représentant */}
          {step === 2 && siretData && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Étape 2 — Votre identité</h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-emerald-900">
                  ✓ {siretData.raison_sociale}
                </p>
                <p className="text-primary text-xs">
                  {siretData.siret} · {siretData.commune} ({siretData.code_postal})
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom complet" required>
                  <input
                    type="text"
                    value={rep.full_name}
                    onChange={(e) => setRep((r) => ({ ...r, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </Field>
                <Field label="Fonction">
                  <select
                    value={rep.role}
                    onChange={(e) => setRep((r) => ({ ...r, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option>Gérant</option>
                    <option>Directeur</option>
                    <option>Directeur commercial</option>
                    <option>Négociateur</option>
                    <option>Autre</option>
                  </select>
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={rep.email}
                    onChange={(e) => setRep((r) => ({ ...r, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </Field>
                <Field label="Téléphone">
                  <input
                    type="tel"
                    value={rep.telephone}
                    onChange={(e) => setRep((r) => ({ ...r, telephone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </Field>
                <Field label="Mot de passe" required className="sm:col-span-2">
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={rep.password}
                      onChange={(e) => setRep((r) => ({ ...r, password: e.target.value }))}
                      placeholder="8 caractères minimum"
                      minLength={8}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </Field>
              </div>
              <NavigationButtons
                onPrev={() => setStep(1)}
                onNext={() => {
                  if (
                    !rep.full_name.trim() ||
                    !rep.email.includes('@') ||
                    rep.password.length < 8
                  ) {
                    setError('Tous les champs requis doivent être remplis (mot de passe ≥ 8 caractères).')
                    return
                  }
                  setError(null)
                  setStep(3)
                }}
              />
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
            </div>
          )}

          {/* STEP 3 — Tier */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Étape 3 — Choisir un palier</h2>
              <p className="text-sm text-gray-600">
                Vous pouvez démarrer en gratuit puis upgrader à tout moment.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['discovery', 'standard', 'premium', 'expert'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`text-left p-4 rounded-xl border-2 transition ${
                      tier === t
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{TIER_LABELS[t]}</p>
                      {tier === t ? (
                        <CheckCircle2 size={18} className="text-blue-600" />
                      ) : null}
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      {TIER_PRICES[t] === 0 ? 'Gratuit' : `${TIER_PRICES[t]} €`}
                      {TIER_PRICES[t] > 0 ? (
                        <span className="text-sm font-normal text-gray-500"> / mois HT</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {TIER_QUOTAS[t] === null ? 'Leads illimités' : `${TIER_QUOTAS[t]} leads / mois`}
                    </p>
                    <ul className="text-xs text-gray-700 mt-3 space-y-1">
                      {TIER_FEATURES[t].map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <CheckCircle2 size={10} className="text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <NavigationButtons onPrev={() => setStep(2)} onNext={() => setStep(4)} />
            </div>
          )}

          {/* STEP 4 — Charte */}
          {step === 4 && siretData && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Étape 4 — Charte partenariat</h2>
              <p className="text-sm text-gray-600">
                Lisez attentivement la charte. La signature électronique vaut acceptation
                au sens du règlement eIDAS.
              </p>
              <div className="border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto bg-gray-50 text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{charteContent}</ReactMarkdown>
              </div>
              <div className="space-y-2">
                {CHARTE_ENGAGEMENTS_RESUME.map((eng) => (
                  <label
                    key={eng.key}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={consents[eng.key]}
                      onChange={(e) =>
                        setConsents((c) => ({ ...c, [eng.key]: e.target.checked }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">{eng.label}</p>
                      <p className="text-xs text-gray-500">{eng.detail}</p>
                    </div>
                  </label>
                ))}
              </div>
              {error ? (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Retour
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFinal}
                  disabled={submitting || !Object.values(consents).every((v) => v)}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader className="animate-spin" size={14} /> : null}
                  {submitting ? 'Signature en cours…' : 'Signer électroniquement'}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                En signant, vous acceptez que votre IP, user-agent et horodatage soient
                enregistrés comme preuve eIDAS.
              </p>
            </div>
          )}

          {/* STEP 5 — Confirmation */}
          {step === 5 && (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-2">
                <Sparkles className="text-success" size={32} />
              </div>
              <h2 className="text-2xl font-semibold">Bienvenue dans le réseau BRH !</h2>
              <p className="text-gray-600">
                Votre charte est signée, votre compte est créé. Redirection vers votre
                espace agence dans 2 secondes…
              </p>
              <Loader className="animate-spin mx-auto text-blue-600" size={20} />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vous avez déjà un compte ?{' '}
          <a href="/connexion" className="text-blue-600 underline">
            Connectez-vous
          </a>
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function NavigationButtons({
  onPrev,
  onNext,
  nextLabel = 'Suivant',
}: {
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="flex justify-between gap-2 pt-2">
      <button
        type="button"
        onClick={onPrev}
        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Retour
      </button>
      <button
        type="button"
        onClick={onNext}
        className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
      >
        {nextLabel} <ChevronRight size={14} />
      </button>
    </div>
  )
}
