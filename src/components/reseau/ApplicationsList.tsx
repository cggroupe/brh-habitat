/**
 * Phase 18.7 — Liste des candidatures (vue publisher uniquement).
 */
import { Check, X, Star, ExternalLink, MessageSquare } from 'lucide-react'
import {
  useApplicationsForOffer,
  useShortlistApplication,
  useSelectApplication,
  useRejectApplication,
} from '@/hooks/queries/reseau-chantier-applications'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-slate-100 text-slate-700' },
  shortlisted: { label: 'Shortlist', cls: 'bg-amber-100 text-amber-700' },
  selected: { label: 'Sélectionné', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Refusé', cls: 'bg-slate-100 text-slate-400 line-through' },
  withdrawn: { label: 'Retirée', cls: 'bg-slate-100 text-slate-400 italic' },
}

interface ApplicationsListProps {
  offerId: string
  /** True si offer.status='open' OR 'negotiating' (sinon on cache les actions). */
  canTakeAction: boolean
}

export default function ApplicationsList({ offerId, canTakeAction }: ApplicationsListProps) {
  const apps = useApplicationsForOffer(offerId)
  const shortlist = useShortlistApplication()
  const select = useSelectApplication()
  const reject = useRejectApplication()

  if (apps.isLoading) {
    return <p className="text-sm text-slate-400 text-center py-6">Chargement des candidatures…</p>
  }

  const list = apps.data ?? []
  if (list.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl">
        Aucune candidature pour le moment.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {list.map((app) => {
        const status = STATUS_LABELS[app.status] ?? { label: app.status, cls: 'bg-slate-100' }
        const amount = app.devis_amount_cents
          ? `${(app.devis_amount_cents / 100).toLocaleString('fr-FR')} € HT`
          : null
        return (
          <div
            key={app.id}
            className="bg-white rounded-xl border border-slate-200/60 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${status.cls}`}>
                  {status.label}
                </span>
                {amount && (
                  <span className="text-xs font-semibold text-slate-700">{amount}</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                {new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {app.message && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{app.message}</p>
            )}

            {app.devis_url && (
              <a
                href={app.devis_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:text-cyan-800 mb-2"
              >
                <ExternalLink size={12} />
                Voir le devis
              </a>
            )}

            {/* Actions publisher (visibles si chantier est ouvert et candidature pending/shortlisted) */}
            {canTakeAction && (app.status === 'pending' || app.status === 'shortlisted') && (
              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                {app.status === 'pending' && (
                  <button
                    onClick={() => shortlist.mutate(app.id)}
                    disabled={shortlist.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition"
                  >
                    <Star size={12} /> Shortlist
                  </button>
                )}
                <button
                  onClick={() => select.mutate(app.id)}
                  disabled={select.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold transition"
                >
                  <Check size={12} /> Sélectionner
                </button>
                <button
                  onClick={() => reject.mutate(app.id)}
                  disabled={reject.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <X size={12} /> Refuser
                </button>
              </div>
            )}

            {/* Statut sélectionné : afficher commission */}
            {app.status === 'selected' && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60 bg-emerald-50/30 rounded-lg p-2 text-xs text-emerald-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  Candidature sélectionnée
                </p>
                {app.commission_pct_snapshot !== null && (
                  <p className="mt-1">
                    Commission verrouillée à <strong>{app.commission_pct_snapshot}% HT</strong>
                    {app.commission_amount_cents !== null
                      ? ` · ${(app.commission_amount_cents / 100).toLocaleString('fr-FR')} € à signature devis`
                      : ' · montant calculé après signature du devis (saisie admin)'}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
