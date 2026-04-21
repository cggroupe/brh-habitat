import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SignUp } from '@clerk/clerk-react'
import { Building2, ArrowRight, Search, CheckCircle2, AlertCircle, MapPin } from 'lucide-react'
// Bridge monte globalement dans App.tsx
import { logError } from '@/lib/error'

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
  already_registered?: boolean
}

// Cle de sessionStorage utilisee par ProFinalisation pour retrouver les infos SIRET
const SIRET_SS_KEY = 'brh_pending_siret_data'

export default function RegisterProPage() {
  const [searchParams] = useSearchParams()
  const recruiter = searchParams.get('recruiter')

  const [step, setStep] = useState<'siret' | 'account'>('siret')
  const [siretInput, setSiretInput] = useState('')
  const [siretData, setSiretData] = useState<SiretData | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [siretError, setSiretError] = useState<string | null>(null)

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
        setSiretError(data.error ?? 'Impossible de verifier le SIRET.')
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

  function proceedToSignup() {
    if (!siretData) return
    // Stocker les donnees pour ProFinalisation (apres signup Clerk)
    sessionStorage.setItem(SIRET_SS_KEY, JSON.stringify({ ...siretData, recruiter }))
    setStep('account')
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

          <div className="flex items-center gap-3 mb-8">
            <div className={`flex-1 h-1.5 rounded-full ${step === 'siret' ? 'bg-primary' : 'bg-primary/40'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step === 'account' ? 'bg-primary' : 'bg-slate-200'}`} />
          </div>

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

              {siretData && siretData.already_registered && (
                <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800">
                        Cette entreprise est <strong>deja enregistree</strong>.
                      </p>
                      <p className="text-xs text-amber-700/80 mt-2">
                        <Link to="/connexion" className="underline font-semibold">Connectez-vous</Link> ou contactez
                        relationsclients@contact-brh.fr.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {siretData && !siretData.already_registered && (
                <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-base text-slate-900">{siretData.nom}</p>
                      <p className="text-xs text-slate-600 mt-0.5">SIRET {siretData.siret} - Actif - Disponible</p>
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
                    onClick={proceedToSignup}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-display text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors uppercase tracking-wide"
                  >
                    Continuer avec {siretData.nom_raison_sociale || siretData.nom}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

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
                  <span className="text-slate-400">· SIRET verifie</span>
                </div>
              </div>

              {/* Clerk SignUp : apres signup, redirige vers /inscription/pro/finalisation
                  qui va creer la company a partir des donnees SIRET du sessionStorage */}
              <SignUp
                signInUrl="/connexion"
                unsafeMetadata={{ role: 'pro', pending_siret: siretData.siret }}
                forceRedirectUrl="/inscription/pro/finalisation"
                fallbackRedirectUrl="/inscription/pro/finalisation"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0 p-0 bg-transparent',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsRoot: 'hidden',
                    socialButtonsBlockButton: 'hidden',
                    socialButtonsIconButton: 'hidden',
                    socialButtons: 'hidden',
                    dividerRow: 'hidden',
                    formButtonPrimary: 'bg-primary hover:bg-primary-dark normal-case font-bold',
                    footer: 'hidden',
                  },
                }}
              />
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
