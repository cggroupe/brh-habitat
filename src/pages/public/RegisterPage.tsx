import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { logError } from '@/lib/error'
import { ArrowRight, UserPlus } from 'lucide-react'
import { updateAffiliateRecruiter } from '@/api/affiliates'

const AUTH_ERROR_MAP: Record<string, string> = {
  'User already registered': 'Cet email est deja utilise. Connectez-vous.',
  'Password should be at least 6 characters': 'Mot de passe trop court (8 caracteres minimum).',
  'Invalid email': 'Adresse email invalide.',
  'For security purposes': 'Trop de tentatives, patientez 60 secondes.',
}

function mapAuthError(msg: string): string {
  for (const [k, v] of Object.entries(AUTH_ERROR_MAP)) if (msg.includes(k)) return v
  return msg
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recruiter = searchParams.get('recruiter') || searchParams.get('ref')
  const setUser = useAppStore((s) => s.setUser)

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.fullName || !form.email || !form.password) {
      setError('Tous les champs marques * sont obligatoires.'); setLoading(false); return
    }
    if (form.password.length < 8) {
      setError('Mot de passe trop court (8 caracteres minimum).'); setLoading(false); return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.fullName, role: 'particulier', phone: form.phone || null } },
      })
      if (authError) { setError(mapAuthError(authError.message)); setLoading(false); return }
      if (!data.user) { setError('Inscription impossible, reessayez.'); setLoading(false); return }

      // Si confirmation email requise (data.session null) : afficher message
      if (!data.session) {
        setError(`Un email de confirmation a ete envoye a ${form.email}. Cliquez sur le lien pour activer votre compte puis connectez-vous.`)
        setLoading(false)
        return
      }

      // Le trigger handle_new_user cree automatiquement profile + brh_affiliates pour les particuliers
      // Lier le recruteur si lien ?recruiter
      if (recruiter) {
        await updateAffiliateRecruiter(data.user.id, recruiter).catch((err) => logError('RegisterPage:recruiter', err))
      }

      // Charger le profile + rediriger
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setUser({
          id: profile.id, email: profile.email, full_name: profile.full_name ?? '',
          role: profile.role, avatar_url: profile.avatar_url ?? undefined,
        })
      }
      navigate('/particulier', { replace: true })
    } catch (err) {
      logError('RegisterPage:submit', err)
      setError('Une erreur inattendue s\'est produite.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <UserPlus size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">Creer un compte</h1>
            <p className="font-body text-sm text-slate-500 mt-2">Rejoignez le reseau BRH et gagnez des recompenses</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body">{error}</div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Nom complet *</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} required autoComplete="name"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="vous@email.fr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Telephone</label>
              <input name="phone" value={form.phone} onChange={handleChange} autoComplete="tel"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="06 12 34 56 78" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Mot de passe *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required autoComplete="new-password"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="8 caracteres minimum" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide mt-6">
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Creer mon compte <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm font-body text-slate-500">
            Deja un compte ?{' '}
            <Link to="/connexion" className="text-primary hover:text-primary-dark font-semibold">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
