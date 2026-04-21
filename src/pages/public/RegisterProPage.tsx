import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { logError } from '@/lib/error'
import { Building2, ArrowRight, Search, CheckCircle2, AlertCircle, MapPin } from 'lucide-react'
import { createCompany, updateCompanyRecruiter } from '@/api/companies'
import { addCompanyMember } from '@/api/company-members'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface SiretData {
  siret: string
  siren: string
  nom: string
  nom_raison_sociale: string
  adresse: string
  code_postal: string
  ville: string
  naf: string | null
  naf_libelle: string | null
  categorie: string | null
  tranche_effectif: string | null
  date_creation: string | null
  dirigeants: Array<{ nom: string; qualite: string | null }>
}

const AUTH_ERROR_MAP: Record<string, string> = {
  'User already registered': 'Cet email est deja utilise. Connectez-vous.',
  'Password should be at least 6 characters': 'Mot de passe trop court (8 caracteres min)',
  'Invalid email': 'Adresse email invalide',
  'Email rate limit exceeded': 'Trop d\'inscriptions, patientez 1 min.',
  'For security purposes, you can only request this after': 'Trop de tentatives, patientez 60 sec.',
}

function mapAuthError(msg: string): string {
  for (const [k, v] of Object.entries(AUTH_ERROR_MAP)) {
    if (msg.includes(k)) return v
  }
  return msg
}

export default function RegisterProPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recruiter = searchParams.get('recruiter')
  const setUser = useAppStore((s) => s.setUser)

  // Flow en 2 etapes : 1) verifier SIRET, 2) creer compte
  const [step, setStep] = useState<'siret' | 'account'>('siret')
  const [siretInput, setSiretInput] = useState('')
  const [siretData, setSiretData] = useState<SiretData | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [siretError, setSiretError] = useState<string | null>(null)

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function verifySiret() {
    setSiretError(null)
    setSiretData(null)
    const siret = siretInput.replace(/\s/g, '')
    if (!/^\d{14}$/.test(siret)) {
      setSiretError('Le SIRET doit contenir 14 chiffres.')
      return
    }
    setVerifying(true)
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/verify-siret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ siret }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.ok) {
        setSiretError(data.error ?? 'Impossible de verifier le SIRET pour le moment.')
        return
      }
      setSiretData(data as SiretData)
    } catch (err) {
      logError('RegisterPro:verifySiret', err)
      setSiretError('Erreur reseau, reessayez.')
    } finally {
      setVerifying(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!siretData) { setError('SIRET non verifie'); return }
    setLoading(true)
    setError(null)

    if (!form.fullName || !form.email || !form.password) {
      setError('Tous les champs marques * sont obligatoires.')
      setLoading(false)
      return
    }
    if (form.password.length < 8) {
      setError('Mot de passe trop court (8 caracteres minimum).')
      setLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: 'pro', phone: form.phone || null } },
      })

      if (authError) { setError(mapAuthError(authError.message)); setLoading(false); return }
      if (!data.user) { setError('Inscription impossible, reessayez.'); setLoading(false); return }

      // Si email confirmation active, data.session est null
      if (!data.session) {
        setError(null)
        setLoading(false)
        setError(`Un email de confirmation a ete envoye a ${form.email}. Cliquez le lien pour activer votre compte.`)
        return
      }

      // Creer l'entreprise avec les donnees OFFICIELLES de l'API SIRENE
      let company
      try {
        company = await createCompany({
          owner_id: data.user.id,
          name: siretData.nom,
          siret: siretData.siret,
          profession: null, // on deduit du NAF cote admin si besoin
          extra: {
            legal_name: siretData.nom_raison_sociale,
            siren: siretData.siren,
            naf_code: siretData.naf,
            naf_label: siretData.naf_libelle,
            entreprise_category: siretData.categorie,
            date_creation: siretData.date_creation,
            address: siretData.adresse,
            city: siretData.ville,
            postal_code: siretData.code_postal,
            siret_verified_at: new Date().toISOString(),
          },
        })
      } catch (err) {
        logError('RegisterPro:createCompany', err)
        const raw = err instanceof Error ? err.message : String(err)
        const msg = raw.toLowerCase().includes('duplicate')
          ? 'Une entreprise avec ce SIRET est deja enregistree. Connectez-vous ou contactez le support.'
          : raw.toLowerCase().includes('row-level security') || raw.toLowerCase().includes('permission')
            ? 'Votre compte n\'est pas encore autorise. Confirmez d\'abord votre email.'
            : `Erreur lors de la creation de l'entreprise : ${raw}`
        setError(msg)
        setLoading(false)
        return
      }

      if (recruiter) {
        await updateCompanyRecruiter(company.id, recruiter).catch((err) => logError('RegisterPro:recruiter', err))
      }
      await addCompanyMember(company.id, data.user.id, 'owner').catch((err) => logError('RegisterPro:addMember', err))

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setUser({ id: profile.id, email: profile.email, full_name: profile.full_name ?? '', role: profile.role, avatar_url: profile.avatar_url ?? undefined })
        navigate('/pro')
      }
    } catch (err) {
      logError('RegisterPro:submit', err)
      setError('Une erreur inattendue s\'est produite. Reessayez dans quelques secondes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Building2 size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">
              Inscription Partenaire
            </h1>
            <p className="font-body text-sm text-slate-500 mt-2">
              {step === 'siret' ? 'Commencez par verifier votre entreprise' : 'Creez votre compte personnel'}
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex-1 h-1.5 rounded-full ${step === 'siret' ? 'bg-primary' : 'bg-primary/40'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step === 'account' ? 'bg-primary' : 'bg-slate-200'}`} />
          </div>

          {/* ─── ETAPE 1 : SIRET ─── */}
          {step === 'siret' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">
                  Numero SIRET de votre entreprise *
                </label>
                <p className="text-xs text-slate-500 mb-2">14 chiffres, trouvables sur tout document officiel (Kbis, factures...)</p>
                <div className="flex gap-2">
                  <input
                    value={siretInput}
                    onChange={(e) => setSiretInput(e.target.value)}
                    maxLength={18}
                    className="flex-1 px-3.5 py-3 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="812 345 678 90012"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void verifySiret()}
                    disabled={verifying || !siretInput.replace(/\s/g, '')}
                    className="px-5 py-3 bg-primary text-white font-display text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide flex items-center gap-2"
                  >
                    {verifying ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Search size={16} /> Verifier</>
                    )}
                  </button>
                </div>
                {siretError && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{siretError}</span>
                  </div>
                )}
              </div>

              {siretData && (
                <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-base text-slate-900">{siretData.nom}</p>
                      <p className="text-xs text-slate-600 mt-0.5">SIRET {siretData.siret} - Actif</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 space-y-1.5 pl-8">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
                      <span>{siretData.adresse || `${siretData.code_postal} ${siretData.ville}`}</span>
                    </div>
                    {siretData.naf_libelle && (
                      <div className="text-slate-600">
                        <span className="font-semibold">Activite :</span> {siretData.naf_libelle} ({siretData.naf})
                      </div>
                    )}
                    {siretData.date_creation && (
                      <div className="text-slate-600">
                        <span className="font-semibold">Creee le :</span> {new Date(siretData.date_creation).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('account')}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-display text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors uppercase tracking-wide"
                  >
                    Continuer avec {siretData.nom_raison_sociale || siretData.nom}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-center text-xs text-slate-400 mb-4 uppercase tracking-widest font-semibold">
                  ou connectez-vous avec
                </p>
                <OAuthButtons redirectTo="/pro" />
              </div>
            </>
          )}

          {/* ─── ETAPE 2 : COMPTE ─── */}
          {step === 'account' && siretData && (
            <>
              <button
                type="button"
                onClick={() => setStep('siret')}
                className="mb-4 text-sm text-primary hover:underline flex items-center gap-1"
              >
                ← Changer d'entreprise
              </button>

              <div className="mb-5 p-3 bg-slate-50 rounded-xl text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="font-semibold">{siretData.nom}</span>
                  <span className="text-slate-400">- SIRET verifie</span>
                </div>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body">
                  {error}
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Nom complet *</label>
                    <input name="fullName" value={form.fullName} onChange={handleChange} required autoComplete="name"
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Telephone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} autoComplete="tel"
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="06 12 34 56 78" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Email professionnel *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email"
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="contact@entreprise.fr" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Mot de passe *</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} required autoComplete="new-password"
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="8 caracteres minimum" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide mt-6">
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Creer mon compte partenaire <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm font-body text-slate-500 mt-6">
            Deja partenaire ?{' '}
            <Link to="/connexion" className="text-primary hover:text-primary-dark font-semibold">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
