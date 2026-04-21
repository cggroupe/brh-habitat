/**
 * Page d'acceptation d'invitation a rejoindre une entreprise pro.
 *
 * URL : /inscription/pro/rejoindre?token=xxx
 *
 * Flow :
 *  1. Verifie le token cote serveur (company-invite-verify)
 *  2. Si valide et user non connecte : affiche Clerk SignUp avec email pre-rempli
 *  3. Si user connecte : bouton "Accepter l'invitation" qui appelle company-invite-accept
 *  4. Apres acceptation : redirect /pro
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SignUp, useUser, useAuth } from '@clerk/clerk-react'
import { Users, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const INVITE_SS_KEY = 'brh_pending_invitation_token'

interface InvitationData {
  invitation_id: string
  company_name: string
  email: string
  inviter_name: string
  expires_at: string
  member_role: 'owner' | 'member'
}

export default function JoinCompanyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const { isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()

  const [state, setState] = useState<'loading' | 'invalid' | 'valid' | 'accepting' | 'done'>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1. Verifier le token
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
        if (!resp.ok || !data.valid) {
          setError(data.error ?? 'Lien d\'invitation invalide.')
          setState('invalid')
          return
        }
        setInvitation(data as InvitationData)
        setState('valid')
        // Stocker le token pour que le webhook post-signup sache quoi faire
        sessionStorage.setItem(INVITE_SS_KEY, token)
      } catch (err) {
        logError('JoinCompany:verify', err)
        setError('Erreur reseau, reessayez.')
        setState('invalid')
      }
    })()
  }, [token])

  // 2. Si user deja connecte, accepter automatiquement l'invitation
  async function acceptInvitation() {
    if (!invitation) return
    setState('accepting')
    try {
      // Recuperer le JWT Supabase (via bridge deja fait)
      const { data: { session } } = await supabase.auth.getSession()
      let accessToken = session?.access_token
      // Fallback : demander un token Clerk
      if (!accessToken) {
        accessToken = await getToken({ template: 'supabase' }) ?? undefined
      }
      if (!accessToken) {
        setError('Session non trouvee. Deconnectez-vous et reconnectez-vous.')
        setState('invalid')
        return
      }

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/company-invite-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error ?? 'Impossible d\'accepter l\'invitation.')
        setState('invalid')
        return
      }
      sessionStorage.removeItem(INVITE_SS_KEY)
      setState('done')
      setTimeout(() => navigate('/pro', { replace: true }), 1500)
    } catch (err) {
      logError('JoinCompany:accept', err)
      setError('Erreur lors de l\'acceptation.')
      setState('invalid')
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
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">
              Invitation a rejoindre une equipe
            </h1>
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
                    Contactez la personne qui vous a invite pour obtenir un nouveau lien,
                    ou <Link to="/inscription/pro" className="underline">inscrivez votre propre entreprise</Link>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === 'valid' && invitation && (
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
                      Invitation envoyee a <strong>{invitation.email}</strong> · Valable jusqu'au{' '}
                      {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {!isLoaded && <div className="w-8 h-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />}

              {isLoaded && isSignedIn && (
                <>
                  <p className="text-sm text-slate-600 mb-4 text-center">
                    Vous etes deja connecte. Cliquez pour rejoindre l'equipe.
                  </p>
                  <button
                    onClick={() => void acceptInvitation()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors uppercase tracking-wide"
                  >
                    Rejoindre l'equipe <ArrowRight size={16} />
                  </button>
                </>
              )}

              {isLoaded && !isSignedIn && (
                <>
                  <p className="text-sm text-slate-600 mb-4 text-center">
                    Creez votre compte avec l'email <strong>{invitation.email}</strong> pour accepter.
                  </p>
                  <SignUp
                    signInUrl="/connexion"
                    unsafeMetadata={{ role: 'pro', pending_invitation_token: token }}
                    forceRedirectUrl={`/inscription/pro/rejoindre?token=${token}`}
                    initialValues={{ emailAddress: invitation.email }}
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
            </>
          )}

          {state === 'accepting' && (
            <div className="text-center py-8">
              <div className="w-10 h-10 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-600">Ajout a l'equipe en cours...</p>
            </div>
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
