import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { ArrowRight, UserPlus, CheckCircle, Mail } from 'lucide-react'

// Map des messages Supabase bruts vers des messages user-friendly
const AUTH_ERROR_MAP: Record<string, string> = {
  'User already registered': 'Un compte existe deja avec cette adresse e-mail.',
  'Invalid email': 'L\'adresse e-mail saisie n\'est pas valide.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 8 caracteres.',
  'Email rate limit exceeded': 'Trop de tentatives. Veuillez patienter quelques minutes.',
  'Signup is disabled': 'Les inscriptions sont temporairement desactivees.',
}

function getFriendlyError(message: string): string {
  return AUTH_ERROR_MAP[message] ?? 'Une erreur est survenue lors de la creation du compte. Veuillez reessayer.'
}

interface PasswordCriteria {
  minLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
}

function getPasswordCriteria(password: string): PasswordCriteria {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }
}

function isPasswordValid(criteria: PasswordCriteria): boolean {
  return criteria.minLength && criteria.hasUppercase && criteria.hasNumber
}

function CriteriaItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${met ? 'bg-primary' : 'bg-slate-300'}`} />
      <span className={`font-body text-xs ${met ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const criteria = getPasswordCriteria(password)
  const passwordValid = isPasswordValid(criteria)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Le nom complet est obligatoire.')
      return
    }

    if (!passwordValid) {
      setPasswordTouched(true)
      setError('Le mot de passe ne respecte pas les criteres de securite.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/connexion`,
      },
    })

    if (authError) {
      setError(getFriendlyError(authError.message))
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Une erreur est survenue lors de la creation du compte.')
      setLoading(false)
      return
    }

    // Si l'email n'est pas confirme (identities vide), afficher le message
    if (data.user.identities?.length === 0 || !data.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    // Si auto-confirme (dev ou config Supabase), rediriger directement
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', data.user.id)
      .single()

    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? fullName,
        role: profile.role as 'user' | 'admin',
        avatar_url: profile.avatar_url ?? undefined,
      })
    }

    setLoading(false)
    navigate('/tableau-de-bord')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">

          {/* Logo & title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <UserPlus size={26} className="text-primary" strokeWidth={2} />
            </div>
            <span className="font-display text-2xl font-bold uppercase tracking-tight text-primary block">
              BRH
            </span>
            <h1 className="font-display text-3xl text-slate-900 mt-3 uppercase tracking-wide leading-none">
              Creer un compte
            </h1>
            <p className="font-body text-sm text-slate-500 mt-3 leading-relaxed">
              Rejoignez BRH Habitat et gerez vos projets
            </p>
          </div>

          {/* Ecran confirmation email */}
          {emailSent ? (
            <div className="flex flex-col items-center text-center py-8 gap-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-slate-900 mb-2">
                  Verifiez votre boite mail
                </h2>
                <p className="font-body text-sm text-slate-500 max-w-sm leading-relaxed">
                  Un email de confirmation a ete envoye a <strong className="text-slate-700">{email}</strong>.
                  Cliquez sur le lien dans l'email pour activer votre compte.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left max-w-sm">
                <p className="font-body text-xs text-amber-700 leading-relaxed">
                  Vous ne trouvez pas l'email ? Verifiez votre dossier spam/courrier indesirable. L'email peut prendre quelques minutes.
                </p>
              </div>
              <Link
                to="/connexion"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors mt-2"
              >
                Aller a la connexion <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
          <>

          {/* Avantages compte */}
          <div className="bg-primary/5 rounded-xl p-5 mb-8 space-y-2">
            {[
              'Suivez vos dossiers de renovation',
              'Acces a vos devis et factures',
              'Planification de rendez-vous en ligne',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle size={14} className="text-primary shrink-0" strokeWidth={2.5} />
                <span className="font-body text-xs text-slate-600">{item}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
            <div>
              <label
                htmlFor="register-name"
                className="block text-sm font-semibold text-slate-700 mb-2 font-body"
              >
                Nom complet
              </label>
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-slate-700 mb-2 font-body"
              >
                Adresse e-mail
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-semibold text-slate-700 mb-2 font-body"
              >
                Mot de passe
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (!passwordTouched) setPasswordTouched(true)
                }}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400"
                placeholder="••••••••"
              />

              {/* Criteres mot de passe — visibles dès que l'utilisateur commence a saisir */}
              {passwordTouched && (
                <div className="mt-3 space-y-1.5">
                  <CriteriaItem met={criteria.minLength} label="8 caracteres minimum" />
                  <CriteriaItem met={criteria.hasUppercase} label="Au moins 1 lettre majuscule" />
                  <CriteriaItem met={criteria.hasNumber} label="Au moins 1 chiffre" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20 uppercase tracking-wide"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creation...
                </>
              ) : (
                <>
                  Creer mon compte
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center mt-8 text-sm font-body text-slate-500">
            Deja un compte ?{' '}
            <Link
              to="/connexion"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Se connecter
            </Link>
          </p>
          </>
          )}
        </div>

        {/* Back to site */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="font-body text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Retour au site
          </Link>
        </p>

      </div>
    </div>
  )
}
