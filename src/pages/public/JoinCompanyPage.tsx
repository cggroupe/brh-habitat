import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { Users, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { logError } from '@/lib/error'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface InvitationData {
  invitation_id: string
  company_name: string
  email: string
  inviter_name: string
  expires_at: string
  member_role: 'owner' | 'member'
}

const AUTH_ERROR_MAP: Record<string, string> = {
  'User already registered': 'Cet email est deja utilise. Connectez-vous.',
  'Password should be at least 6 characters': 'Mot de passe trop court (8 caracteres minimum).',
}
function mapAuthError(msg: string): string {
  for (const [k, v] of Object.entries(AUTH_ERROR_MAP)) if (msg.includes(k)) return v
  return msg
}

export default function JoinCompanyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const setUser = useAppStore((s) => s.setUser)

  const [state, setState] = useState<'loading' | 'invalid' | 'valid' | 'signing-up' | 'accepting' | 'done'>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({ fullName: '', phone: '', password: '' })

  useEffect(() => {
    if (!token) { setState('invalid'); setError('Lien d\'invitation manquant.'); return }
    void (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/company-invite-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ token }),
        })
        const data = await resp.json()
        if (!resp.ok || !data.valid) { setError(data.error ?? 'Lien invalide.'); setState('invalid'); return }
        setInvitation(data as InvitationData); setState('valid')
      } catch (err) { logError('JoinCompany:verify', err); setError('Erreur reseau.'); setState('invalid') }
    })()
  }, [token])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function acceptToken(accessToken: string): Promise<void> {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/company-invite-accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation) return
    setState('signing-up'); setError(null)

    if (!form.fullName || !form.password) { setError('Nom et mot de passe requis.'); setState('valid'); return }
    if (form.password.length < 8) { setError('Mot de passe trop court.'); setState('valid'); return }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: invitation.email, password: form.password,
        options: { data: { full_name: form.fullName, role: 'pro', phone: form.phone || null } },
      })
      if (authError) { setError(mapAuthError(authError.message)); setState('valid'); return }
      if (!data.user) { setError('Inscription impossible.'); setState('valid'); return }

      if (!data.session) {
        setError(`Un email de confirmation a ete envoye a ${invitation.email}. Cliquez le lien puis revenez ici pour accepter l'invitation.`)
        setState('invalid')
        return
      }

      setState('accepting')
      try {
        await acceptToken(data.session.access_token)
      } catch (err) {
        logError('JoinCompany:accept', err)
        setError(err instanceof Error ? err.message : 'Erreur acceptation.')
        setState('valid'); return
      }

      const { data: profile } = await supabase
        .from('profiles').select('id, email, full_name, role, avatar_url').eq('id', data.user.id).single()
      if (profile) {
        setUser({
          id: profile.id, email: profile.email, full_name: profile.full_name ?? '',
          role: profile.role, avatar_url: profile.avatar_url ?? undefined,
        })
      }
      setState('done')
      setTimeout(() => navigate('/pro', { replace: true }), 1500)
    } catch (err) {
      logError('JoinCompany:signup', err)
      setError('Une erreur inattendue s\'est produite.')
      setState('valid')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Users size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">Invitation a rejoindre une equipe</h1>
          </div>

          {state === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {state === 'invalid' && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-semibold">{error ?? 'Lien invalide'}</p>
                  <p className="text-xs text-red-600/80 mt-2">
                    Contactez votre invitant ou <Link to="/inscription/pro" className="underline">inscrivez votre propre entreprise</Link>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(state === 'valid' || state === 'signing-up' || state === 'accepting') && invitation && (
            <>
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-700">
                      <strong className="text-slate-900">{invitation.inviter_name}</strong> vous invite
                      a rejoindre <strong className="text-slate-900">{invitation.company_name}</strong>
                    </p>
                    <p className="text-xs text-slate-600 mt-1.5">
                      Email : <strong>{invitation.email}</strong>
                    </p>
                  </div>
                </div>
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

                <button type="submit" disabled={state !== 'valid'}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide mt-6">
                  {state === 'signing-up' || state === 'accepting' ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Rejoindre l'equipe <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {state === 'done' && (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center">
              <CheckCircle2 size={32} className="text-green-600 mx-auto mb-3" />
              <p className="font-display text-lg font-bold text-slate-900 uppercase tracking-wide">Bienvenue !</p>
              <p className="text-sm text-slate-600 mt-2">Redirection vers votre espace...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
