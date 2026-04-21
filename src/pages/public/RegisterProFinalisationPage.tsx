/**
 * Page de finalisation apres signup pro via Clerk.
 *
 * Flow :
 *  1. Le user arrive ici apres signup Clerk avec `redirectUrl="/inscription/pro/finalisation"`
 *  2. Le hook useClerkSupabaseBridge a deja synchronise la session Supabase
 *  3. On lit les donnees SIRET depuis sessionStorage (stockees dans RegisterProPage)
 *  4. On cree l'entreprise dans brh_companies + company_members
 *  5. Redirect vers /pro
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { createCompany, updateCompanyRecruiter } from '@/api/companies'
import { addCompanyMember } from '@/api/company-members'
// Bridge monte globalement dans App.tsx
import { useAppStore } from '@/stores/appStore'
import { logError } from '@/lib/error'
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react'

const SIRET_SS_KEY = 'brh_pending_siret_data'

interface PendingSiret {
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
  date_creation: string | null
  recruiter?: string | null
}

export default function RegisterProFinalisationPage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()
  const user = useAppStore((s) => s.user)

  const [status, setStatus] = useState<'bridge' | 'creating' | 'done' | 'error'>('bridge')
  const [error, setError] = useState<string | null>(null)

  // Timeout : si le bridge ne finit pas en 15s, on affiche une erreur plutot que de bloquer l'user
  useEffect(() => {
    if (user || status !== 'bridge') return
    const timer = setTimeout(() => {
      if (!useAppStore.getState().user) {
        setError('La synchronisation de votre compte a echoue. Reessayez dans quelques instants ou contactez support.')
        setStatus('error')
      }
    }, 15_000)
    return () => clearTimeout(timer)
  }, [user, status])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      navigate('/inscription/pro', { replace: true })
      return
    }
    // Attendre que le bridge Supabase soit termine (user est dans le store)
    if (!user) return

    const raw = sessionStorage.getItem(SIRET_SS_KEY)
    if (!raw) {
      // Pas d'infos SIRET : l'user est probablement arrive ici par hasard, on renvoie au dashboard
      navigate('/pro', { replace: true })
      return
    }

    const pending = JSON.parse(raw) as PendingSiret

    async function finalize() {
      setStatus('creating')
      try {
        const company = await createCompany({
          owner_id: user!.id,
          name: pending.nom,
          siret: pending.siret,
          profession: null,
          extra: {
            legal_name: pending.nom_raison_sociale,
            siren: pending.siren,
            naf_code: pending.naf,
            naf_label: pending.naf_libelle,
            entreprise_category: pending.categorie,
            date_creation: pending.date_creation,
            address: pending.adresse,
            city: pending.ville,
            postal_code: pending.code_postal,
            siret_verified_at: new Date().toISOString(),
          },
        })

        if (pending.recruiter) {
          await updateCompanyRecruiter(company.id, pending.recruiter).catch((e) => logError('finalize:recruiter', e))
        }
        await addCompanyMember(company.id, user!.id, 'owner').catch((e) => logError('finalize:addMember', e))

        sessionStorage.removeItem(SIRET_SS_KEY)
        setStatus('done')
        setTimeout(() => navigate('/pro', { replace: true }), 1200)
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err)
        logError('RegisterProFinalisation', err)
        const msg = raw.toLowerCase().includes('duplicate')
          ? 'Une entreprise avec ce SIRET est deja enregistree. Contactez le support.'
          : `Erreur lors de la creation de l'entreprise : ${raw.slice(0, 200)}`
        setError(msg)
        setStatus('error')
      }
    }

    void finalize()
  }, [isLoaded, isSignedIn, user, navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-10 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
            {status === 'done' ? (
              <CheckCircle2 size={26} className="text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle size={26} className="text-red-600" />
            ) : (
              <Building2 size={26} className="text-primary" />
            )}
          </div>
          <h1 className="font-display text-xl text-slate-900 uppercase tracking-wide mb-3">
            {status === 'bridge' && 'Connexion en cours...'}
            {status === 'creating' && 'Creation de votre entreprise...'}
            {status === 'done' && 'Bienvenue chez BRH !'}
            {status === 'error' && 'Un probleme est survenu'}
          </h1>
          {status === 'bridge' && <p className="text-sm text-slate-500">Initialisation de votre session</p>}
          {status === 'creating' && <p className="text-sm text-slate-500">Enregistrement des donnees officielles SIRENE</p>}
          {status === 'done' && <p className="text-sm text-slate-500">Redirection vers votre espace...</p>}
          {status === 'error' && error && (
            <p className="text-sm text-red-600 mt-2 bg-red-50 p-3 rounded-xl">{error}</p>
          )}
          {status !== 'done' && status !== 'error' && (
            <div className="mt-6 w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          )}
        </div>
      </div>
    </div>
  )
}
