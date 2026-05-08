/**
 * Phase 18.7 — Détail offre de chantier `/reseau/chantiers/:id`.
 *
 * 2 vues conditionnelles :
 *   - Publisher (publisher_pro_id = mon partner_contract_id) : voit les candidatures
 *     reçues + actions shortlist/select/reject + close/cancel
 *   - Candidat : formulaire candidature si pas déjà postulé, sinon statut de sa candidature
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  Euro,
  Lock,
  Check,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useChantier, useCloseChantier, useCancelChantier } from '@/hooks/queries/reseau-chantiers'
import {
  useApplicationsForOffer,
  useMyApplications,
} from '@/hooks/queries/reseau-chantier-applications'
import { supabase } from '@/lib/supabase'
import ApplicationForm from '@/components/reseau/ApplicationForm'
import ApplicationsList from '@/components/reseau/ApplicationsList'

const MODE_LABELS: Record<string, string> = {
  sous_traitance: 'Sous-traitance',
  co_traitance: 'Co-traitance',
  apport: "Apport d'affaires",
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-700' },
  open: { label: 'Ouvert', cls: 'bg-emerald-100 text-emerald-700' },
  negotiating: { label: 'En négociation', cls: 'bg-amber-100 text-amber-700' },
  assigned: { label: 'Assigné', cls: 'bg-cyan-100 text-cyan-700' },
  signed: { label: 'Signé', cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Clôturé', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Annulé', cls: 'bg-red-100 text-red-700' },
}

export default function ReseauChantierDetail() {
  const { id } = useParams<{ id: string }>()
  const chantier = useChantier(id)
  const apps = useApplicationsForOffer(id ?? null)
  const myApps = useMyApplications()
  const closeMut = useCloseChantier()
  const cancelMut = useCancelChantier()

  const [myProId, setMyProId] = useState<string | null>(null)

  // Récupère mon partner_contract_id pour distinguer publisher vs candidat
  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) return
      const { data } = await supabase
        .from('brh_partner_contracts')
        .select('id')
        .eq('signer_profile_id', user.id)
        .eq('status', 'active')
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setMyProId(data?.id ?? null)
    })()
  }, [])

  if (chantier.isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        <p className="text-sm text-slate-400 text-center">Chargement…</p>
      </div>
    )
  }

  if (!chantier.data) {
    return (
      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm">Cette offre n'existe plus ou n'est pas accessible.</p>
        </div>
        <Link to="/reseau/chantiers" className="inline-flex items-center gap-1.5 mt-4 text-cyan-700 text-sm">
          <ArrowLeft size={14} /> Retour à la marketplace
        </Link>
      </div>
    )
  }

  const c = chantier.data
  const isPublisher = myProId !== null && c.publisher_pro_id === myProId
  const myAppOnThisOffer = (myApps.data ?? []).find((a) => a.offer_id === c.id)
  const status = STATUS_LABELS[c.status] ?? { label: c.status, cls: 'bg-slate-100' }
  const canTakeAction = c.status === 'open' || c.status === 'negotiating'
  const location = [c.commune, c.code_postal, c.departement].filter(Boolean).join(' · ')
  const budget =
    c.budget_visible && c.budget_cents
      ? `${(c.budget_cents / 100).toLocaleString('fr-FR')} € HT`
      : null

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-5">
      <Link
        to="/reseau/chantiers"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Marketplace chantiers
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-700">
              {MODE_LABELS[c.contract_mode] ?? c.contract_mode}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${status.cls}`}>
              {status.label}
            </span>
            {c.visibility !== 'public' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                <Lock size={10} /> {c.visibility === 'reseau' ? 'Réseau' : 'Privé'}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-display text-slate-800 mb-2">{c.title}</h1>

        {c.description && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">
            {c.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mb-4">
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-400" />
              <span>{location}</span>
            </div>
          )}
          {c.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>
                Début {new Date(c.start_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {c.duration_weeks && ` · ${c.duration_weeks} sem.`}
              </span>
            </div>
          )}
          {budget && (
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Euro size={14} />
              {budget}
            </div>
          )}
          <div className="flex items-center gap-1.5 font-semibold text-cyan-700 ml-auto">
            Commission {c.commission_offer_pct}% HT
          </div>
        </div>

        {/* Métiers tags */}
        {c.metiers_recherches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
            {c.metiers_recherches.map((m) => (
              <span
                key={m}
                className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-medium"
              >
                {m.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vue PUBLISHER : actions + liste candidatures */}
      {isPublisher && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                Candidatures reçues
                {apps.data && apps.data.length > 0 && (
                  <span className="ml-2 text-xs text-slate-500">({apps.data.length})</span>
                )}
              </h2>
              {canTakeAction && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => closeMut.mutate(c.id)}
                    disabled={closeMut.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <Check size={12} /> Clôturer
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Raison de l\'annulation ?') ?? undefined
                      cancelMut.mutate({ id: c.id, reason })
                    }}
                    disabled={cancelMut.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition"
                  >
                    <XCircle size={12} /> Annuler
                  </button>
                </div>
              )}
            </div>
            <ApplicationsList offerId={c.id} canTakeAction={canTakeAction} />
          </div>
        </>
      )}

      {/* Vue CANDIDAT : form ou statut */}
      {!isPublisher && (
        <>
          {myAppOnThisOffer ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Votre candidature</h2>
              <div
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  myAppOnThisOffer.status === 'selected'
                    ? 'bg-emerald-100 text-emerald-700'
                    : myAppOnThisOffer.status === 'rejected'
                    ? 'bg-slate-100 text-slate-400 line-through'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                Statut : {myAppOnThisOffer.status}
              </div>
              {myAppOnThisOffer.message && (
                <p className="text-sm text-slate-600 mt-2 italic">"{myAppOnThisOffer.message}"</p>
              )}
            </div>
          ) : (
            canTakeAction && <ApplicationForm offerId={c.id} />
          )}
        </>
      )}
    </div>
  )
}
