/**
 * Phase A (refonte UX 2026-05-08) — Login + workspace switcher.
 *
 * Avant : redirection silencieuse en fonction du premier membership trouvé
 * (artisan > agence > role) → confus quand un user a plusieurs accès.
 *
 * Maintenant : on calcule TOUS les portails accessibles. Si > 1, on affiche un
 * écran "Choisir mon espace" (style Stripe / Notion workspace switcher).
 * Si == 1, redirect direct comme avant.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import {
  ArrowRight,
  Shield,
  Home,
  Wrench,
  Building2,
  ShieldCheck,
  LogIn,
} from 'lucide-react'
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

interface PortalAccess {
  id: 'particulier' | 'pro' | 'artisan' | 'agence' | 'admin' | 'user'
  path: string
  label: string
  description: string
  Icon: typeof Home
  accent: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate'
}

const PORTAL_META: Record<PortalAccess['id'], Omit<PortalAccess, 'id'>> = {
  particulier: {
    path: '/particulier',
    label: 'Espace Particulier',
    description: 'Mes logements, audits, parrainage',
    Icon: Home,
    accent: 'emerald',
  },
  pro: {
    path: '/pro',
    label: 'Espace Professionnel',
    description: 'Prospection, chantiers, chiffrage, équipe',
    Icon: Wrench,
    accent: 'amber',
  },
  artisan: {
    path: '/artisan',
    label: 'Espace Artisan',
    description: 'Missions et agenda',
    Icon: Wrench,
    accent: 'amber',
  },
  agence: {
    path: '/agence',
    label: 'Espace Agence',
    description: 'Foncier, leads vendeurs, score vente',
    Icon: Building2,
    accent: 'blue',
  },
  admin: {
    path: '/admin',
    label: 'Console Admin',
    description: 'Modération, opérations, données',
    Icon: ShieldCheck,
    accent: 'purple',
  },
  user: {
    path: '/tableau-de-bord',
    label: 'Mon tableau de bord',
    description: 'Espace standard',
    Icon: LogIn,
    accent: 'slate',
  },
}

const ACCENT_HALO: Record<PortalAccess['accent'], string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-700',
}

/**
 * Liste TOUS les portails accessibles à l'utilisateur (membership-first).
 * Le rôle profile est utilisé en fallback uniquement si aucun membership.
 */
async function listAccessiblePortals(
  userId: string,
  role: string,
): Promise<PortalAccess[]> {
  const portals: PortalAccess[] = []

  // Admin = priorité absolue (et persona unique en pratique).
  if (role === 'admin') {
    portals.push({ id: 'admin', ...PORTAL_META.admin })
  }

  const [{ data: artisan }, { data: agence }, { data: company }, { data: affiliate }] =
    await Promise.all([
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
      supabase
        .from('brh_companies')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle(),
      supabase.from('brh_affiliates').select('id').eq('id', userId).maybeSingle(),
    ])

  if (agence) portals.push({ id: 'agence', ...PORTAL_META.agence })
  // Pro = espace unique pour tous les BTP (RGE ou non). Si pas de brh_companies
  // mais brh_artisans_rge présent → fallback /artisan (legacy onboarding magic link
  // historique, conservé pour rétrocompat).
  if (company) {
    portals.push({ id: 'pro', ...PORTAL_META.pro })
  } else if (artisan) {
    portals.push({ id: 'artisan', ...PORTAL_META.artisan })
  }

  // Particulier + affilié = un seul espace pour l'instant (Phase C couvrira le mode MLM).
  if (role === 'particulier' || affiliate) {
    portals.push({ id: 'particulier', ...PORTAL_META.particulier })
  }

  // Fallback ultime : aucune membership et pas particulier ⇒ tableau-de-bord générique.
  if (portals.length === 0) {
    portals.push({ id: 'user', ...PORTAL_META.user })
  }

  return portals
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Si l'user a accès à plusieurs portails, on affiche le sélecteur sur le même écran.
  const [portals, setPortals] = useState<PortalAccess[] | null>(null)
  const [userFullName, setUserFullName] = useState<string>('')

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

      const accessible = await listAccessiblePortals(profile.id, profile.role)

      // 1 seul portail → redirect direct (comportement historique).
      if (accessible.length === 1) {
        navigate(accessible[0].path, { replace: true })
        return
      }

      // > 1 portail → écran de choix.
      setUserFullName(profile.full_name ?? '')
      setPortals(accessible)
      setLoading(false)
    } catch (err) {
      logError('LoginPage:submit', err)
      setError('Une erreur inattendue s\'est produite.')
      setLoading(false)
    }
  }

  // ----- Workspace switcher (multi-portails) -----
  if (portals) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-surface rounded-2xl p-8 lg:p-10 border border-border shadow-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 mb-4">
                <ShieldCheck size={22} />
              </div>
              <h1 className="font-display text-2xl text-text font-bold tracking-tight">
                Bonjour {userFullName.split(' ')[0] || ''}
              </h1>
              <p className="text-sm text-text-muted mt-2">
                Vous avez accès à plusieurs espaces. Choisissez celui que vous voulez utiliser.
              </p>
            </div>

            <div className="space-y-2.5">
              {portals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(p.path, { replace: true })}
                  className="w-full group bg-surface rounded-xl border border-border hover:border-emerald-300 hover:shadow-sm transition-all p-4 flex items-center gap-4 text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-lg ${ACCENT_HALO[p.accent]} flex items-center justify-center shrink-0`}
                  >
                    <p.Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text">{p.label}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{p.description}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-text-subtle group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-text-muted mt-6">
              Vous pourrez basculer entre vos espaces à tout moment depuis le menu.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ----- Login form (default) -----
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
        </div>
      </div>
    </div>
  )
}
