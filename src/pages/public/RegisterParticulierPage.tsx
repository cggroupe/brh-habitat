import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { Heart, ArrowRight } from 'lucide-react'

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function RegisterParticulierPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const setUser = useAppStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.fullName || !form.email || !form.password) {
      setError('Veuillez remplir tous les champs obligatoires.')
      setLoading(false)
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: 'particulier',
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Mettre a jour le profil
      await supabase
        .from('profiles')
        .update({ role: 'particulier', phone: form.phone || null })
        .eq('id', data.user.id)

      // Creer l'affilie avec code de parrainage unique
      await supabase.from('brh_affiliates').insert({
        id: data.user.id,
        referral_code: generateReferralCode(),
      })

      // Charger profil et naviguer
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name ?? '',
          role: profile.role,
          avatar_url: profile.avatar_url ?? undefined,
        })
        navigate('/particulier')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Heart size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">
              Devenir affilie
            </h1>
            <p className="font-body text-sm text-slate-500 mt-2">
              Parrainez vos proches, gagnez des cadeaux
            </p>
            {refCode && (
              <p className="font-body text-xs text-primary mt-1">
                Parraine par : {refCode}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Nom complet *</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Jean Dupont" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="vous@exemple.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Telephone</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="06 12 34 56 78" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Mot de passe *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required autoComplete="new-password"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="8 caracteres minimum" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide">
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Creer mon compte <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm font-body text-slate-500 mt-6">
            Deja affilie ?{' '}
            <Link to="/connexion" className="text-primary hover:text-primary-dark font-semibold">Se connecter</Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="font-body text-sm text-slate-400 hover:text-slate-600">Retour au site</Link>
        </p>
      </div>
    </div>
  )
}
