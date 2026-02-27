import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowRight, Shield } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      navigate('/tableau-de-bord')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">

          {/* Logo & title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Shield size={26} className="text-primary" strokeWidth={2} />
            </div>
            <span className="font-display text-2xl font-bold uppercase tracking-tight text-primary block">
              BRH
            </span>
            <h1 className="font-display text-3xl text-slate-900 mt-3 uppercase tracking-wide leading-none">
              Connexion
            </h1>
            <p className="font-body text-sm text-slate-500 mt-3 leading-relaxed">
              Accedez a votre espace personnel BRH
            </p>
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
                htmlFor="login-email"
                className="block text-sm font-semibold text-slate-700 mb-2 font-body"
              >
                Adresse e-mail
              </label>
              <input
                id="login-email"
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
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-slate-700 font-body"
                >
                  Mot de passe
                </label>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20 uppercase tracking-wide"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm font-body text-slate-500">
            Pas encore de compte ?{' '}
            <Link
              to="/inscription"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Creer un compte
            </Link>
          </p>
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
