import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { ArrowRight, Shield } from 'lucide-react'
import { logError } from '@/lib/error'

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Votre email n\'est pas encore confirme. Verifiez votre boite mail.',
  'Invalid email': 'Adresse email invalide.',
}

function mapAuthError(msg: string): string {
  for (const [k, v] of Object.entries(AUTH_ERROR_MAP)) if (msg.includes(k)) return v
  return msg
}

const ROLE_PORTAL: Record<string, string> = {
  admin: '/admin',
  pro: '/pro',
  particulier: '/particulier',
  user: '/tableau-de-bord',
}

/**
 * Détecte les memberships externes au champ profile.role :
 *   - artisan_rge (Phase R4)  → /artisan
 *   - agence_immo (Phase 16)  → /agence
 * Retourne le path à utiliser, ou null si aucune membership détectée
 * (auquel cas on fallback sur ROLE_PORTAL[role]).
 */
async function detectMembershipPortal(userId: string): Promise<string | null> {
  // Vérification artisan en premier (plus probable de coexister)
  const [{ data: artisan }, { data: agence }] = await Promise.all([
    supabase
      .from('brh_artisans_rge')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('brh_partner_contracts')
      .select('id')
      .eq('signer_profile_id', userId)
      .eq('partner_type', 'agence_immo')
      .eq('status', 'active')
      .maybeSingle(),
  ])
  if (artisan) return '/artisan'
  if (agence) return '/agence'
  return null
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(mapAuthError(authError.message)); setLoading(false); return }
      if (!data.user) { setError('Connexion impossible, reessayez.'); setLoading(false); return }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', data.user.id)
        .single()

      if (profileErr || !profile) {
        logError('LoginPage:profile', profileErr)
        setError('Impossible de charger votre profil. Contactez le support.')
        setLoading(false)
        return
      }

      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? '',
        role: profile.role,
        avatar_url: profile.avatar_url ?? undefined,
      })

      // Priorité aux memberships (artisan/agence) sur le profile.role
      const membershipPath = await detectMembershipPortal(profile.id)
      const target = membershipPath ?? ROLE_PORTAL[profile.role] ?? '/tableau-de-bord'
      navigate(target, { replace: true })
    } catch (err) {
      logError('LoginPage:submit', err)
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
              <Shield size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">Connexion</h1>
            <p className="font-body text-sm text-slate-500 mt-2">Acces a votre espace BRH Habitat</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="vous@email.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Mot de passe</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide">
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Se connecter <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm font-body text-slate-500">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary hover:text-primary-dark font-semibold">Creer un compte</Link>
          </p>
          <p className="text-center mt-2 text-sm font-body text-slate-500">
            Professionnel partenaire ?{' '}
            <Link to="/inscription/pro" className="text-primary hover:text-primary-dark font-semibold">Inscription pro</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
