/**
 * Phase 13.6.5 — Page onboarding artisan via magic link.
 *
 * Flow :
 *   1. Artisan reçoit l'email avec lien `/artisan/onboarding/:token`
 *   2. Page verify le token → affiche infos artisan
 *   3. User saisit son email → Supabase envoie un OTP magic link
 *   4. User clique le lien dans l'email → arrive ici avec session active
 *   5. Page accept l'invitation → lie profile_id à artisan
 *   6. Redirige vers /artisan/dashboard
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Wrench,
  Loader,
  CheckCircle,
  AlertTriangle,
  Mail,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { artisanInvitationsApi, type InviteVerifyResult } from '@/api/artisan-invitations'
import { supabase } from '@/lib/supabase'

const GESTES_LABELS: Record<string, string> = {
  pac_air_eau: 'PAC air-eau',
  pac_eau_eau: 'PAC eau-eau',
  pac_air_air: 'PAC air-air',
  isolation_combles_perdus: 'Isolation combles perdus',
  isolation_combles_amenages: 'Isolation combles aménagés',
  isolation_murs_ite: 'Isolation murs ITE',
  isolation_murs_iti: 'Isolation murs ITI',
  isolation_plancher_bas: 'Isolation plancher bas',
  fenetres_double_vitrage: 'Fenêtres double',
  fenetres_triple_vitrage: 'Fenêtres triple',
  porte_isolante: 'Porte isolante',
  vmc_double_flux: 'VMC double flux',
  vmc_simple_flux: 'VMC simple flux',
  chauffage_bois_buche: 'Chauffage bois bûche',
  chauffage_bois_granules: 'Chauffage granulés',
  chauffage_solaire: 'Chauffage solaire',
  chauffe_eau_solaire: 'Chauffe-eau solaire',
  chauffe_eau_thermodynamique: 'Chauffe-eau thermo',
}

type FlowStep = 'loading' | 'invalid' | 'identify' | 'sent' | 'accepting' | 'done' | 'error'

export default function ArtisanOnboarding() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<FlowStep>(token ? 'loading' : 'invalid')
  const [verify, setVerify] = useState<InviteVerifyResult | null>(null)
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(token ? null : 'Token manquant')
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)

  // Étape 1 : verify le token au montage
  useEffect(() => {
    if (!token) return
    let canceled = false
    artisanInvitationsApi
      .verify(token)
      .then((res) => {
        if (canceled) return
        setVerify(res)
        if (!res.valid) {
          setStep('invalid')
          setErrorMsg(
            res.reason === 'expired'
              ? 'Cette invitation a expiré (valable 30 jours).'
              : res.reason === 'accepted'
                ? 'Cette invitation a déjà été utilisée.'
                : res.reason === 'revoked'
                  ? 'Cette invitation a été révoquée.'
                  : 'Lien invalide. Vérifiez l\'URL ou contactez BRH.',
          )
        } else {
          setEmail(res.emailTo ?? '')
          setStep('identify')
        }
      })
      .catch((e) => {
        if (canceled) return
        setStep('error')
        setErrorMsg(e instanceof Error ? e.message : String(e))
      })
    return () => {
      canceled = true
    }
  }, [token])

  // Étape 4 (auto) : si user déjà signé via le magic link Supabase, accept directement
  useEffect(() => {
    if (step !== 'identify' || !token || !verify?.valid) return

    let canceled = false
    supabase.auth.getSession().then(({ data }) => {
      if (canceled) return
      const sessionUser = data.session?.user
      if (sessionUser) {
        setSessionUserId(sessionUser.id)
        // Accept auto si user déjà connecté
        setStep('accepting')
      }
    })
    return () => {
      canceled = true
    }
  }, [step, token, verify])

  useEffect(() => {
    if (step !== 'accepting' || !token) return
    let canceled = false
    artisanInvitationsApi
      .accept(token)
      .then((res) => {
        if (canceled) return
        if (res.success) {
          setStep('done')
          setTimeout(() => navigate('/artisan/dashboard'), 1500)
        } else {
          setStep('error')
          setErrorMsg(res.message ?? 'Échec acceptation')
        }
      })
      .catch((e) => {
        if (canceled) return
        setStep('error')
        setErrorMsg(e instanceof Error ? e.message : String(e))
      })
    return () => {
      canceled = true
    }
  }, [step, token, navigate])

  const handleSendMagicLink = async () => {
    if (!email || !token) return
    setErrorMsg(null)
    try {
      await artisanInvitationsApi.sendMagicLink(email, token)
      setStep('sent')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
    }
  }

  // ===== Render =====
  if (step === 'loading') {
    return (
      <CenteredCard>
        <Loader className="h-8 w-8 animate-spin text-amber-700" />
        <p className="mt-4 text-sm text-gray-600">Vérification du lien…</p>
      </CenteredCard>
    )
  }

  if (step === 'invalid' || step === 'error') {
    return (
      <CenteredCard>
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Lien invalide</h1>
        <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retour à l&apos;accueil
        </Link>
      </CenteredCard>
    )
  }

  if (step === 'sent') {
    return (
      <CenteredCard>
        <Mail className="h-12 w-12 text-blue-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Vérifiez votre boîte mail</h1>
        <p className="mt-2 text-sm text-gray-600">
          Nous venons d&apos;envoyer un lien de connexion à <strong>{email}</strong>.
          <br />
          Cliquez sur le lien pour activer votre compte BRH automatiquement.
        </p>
        <p className="mt-4 text-xs text-gray-500">
          Pas reçu ? Vérifiez vos spams ou{' '}
          <button
            type="button"
            onClick={handleSendMagicLink}
            className="text-blue-700 underline hover:text-blue-900"
          >
            renvoyez le lien
          </button>
          .
        </p>
      </CenteredCard>
    )
  }

  if (step === 'accepting') {
    return (
      <CenteredCard>
        <Loader className="h-8 w-8 animate-spin text-amber-700" />
        <p className="mt-4 text-sm text-gray-600">Activation de votre compte artisan…</p>
        {sessionUserId && (
          <p className="mt-2 text-[10px] text-gray-400 font-mono">user {sessionUserId.slice(0, 8)}</p>
        )}
      </CenteredCard>
    )
  }

  if (step === 'done') {
    return (
      <CenteredCard>
        <CheckCircle className="h-12 w-12 text-green-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Compte activé !</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bienvenue chez BRH Habitat. Redirection vers votre dashboard…
        </p>
      </CenteredCard>
    )
  }

  // step === 'identify' — formulaire saisie email
  const artisan = verify?.artisan
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border-2 border-amber-200 bg-white shadow-xl">
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-100 to-orange-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white p-2">
                <Wrench className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-950">
                  Bienvenue chez BRH Habitat
                </h1>
                <p className="text-sm text-amber-800">
                  Activez votre compte artisan en 30 secondes
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {artisan && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {artisan.nom_entreprise}
                </div>
                {artisan.representant && (
                  <div className="mt-1 text-xs text-gray-600">{artisan.representant}</div>
                )}
                {(artisan.commune || artisan.code_postal) && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" /> {artisan.code_postal} {artisan.commune}
                  </div>
                )}
                {artisan.geste_specialites.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {artisan.geste_specialites.slice(0, 8).map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-900"
                      >
                        {GESTES_LABELS[g] ?? g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {verify?.messagePersonnel && (
              <div className="mb-6 rounded-md border-l-4 border-amber-400 bg-amber-50 p-3 text-xs italic text-amber-900">
                {verify.messagePersonnel}
              </div>
            )}

            <h2 className="mb-2 text-base font-bold text-gray-900">
              Confirmez votre adresse email
            </h2>
            <p className="mb-4 text-xs text-gray-600">
              Nous allons vous envoyer un lien de connexion magique. Aucun mot de passe à
              retenir — vous cliquez sur le lien et c&apos;est tout.
            </p>

            {errorMsg && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-900">
                {errorMsg}
              </div>
            )}

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="w-full rounded-md border-gray-300 text-sm"
                required
              />
            </label>

            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-700 px-4 py-3 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4" />
              Recevoir le lien magique
            </button>

            <div className="mt-6 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
              <strong>Ce qui vous attend :</strong>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>Recevez des leads bretons gratuits qualifiés (DPE F/G + MPR éligibles)</li>
                <li>Aucun abonnement de base — payez 5 % du chantier UNIQUEMENT si vous signez</li>
                <li>Score qualité dynamique → priorité sur les nouveaux leads</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border-2 border-amber-200 bg-white p-8 text-center shadow-xl">
        {children}
      </div>
    </div>
  )
}
