/**
 * Phase 18.9 — Page admin modération réseau social `/admin/reseau-moderation`.
 *
 * Mode dev V1 : workflow signalements (pending → reviewed/dismissed/action_taken).
 * Actions : dismiss / hide_post / hide_comment / unhide.
 * DPIA RGPD complet reporté V2 après audit légal.
 */
import { useState } from 'react'
import {
  ShieldAlert,
  X,
  EyeOff,
  Eye,
  Check,
  AlertCircle,
  Flag,
  Image as ImageIcon,
} from 'lucide-react'
import {
  useAdminReports,
  useDismissReport,
  useHidePostAndResolve,
  useHideCommentAndResolve,
  useUnhidePost,
} from '@/hooks/queries/admin-reseau-moderation'
import type { ReportStatus } from '@/api/admin-reseau-moderation'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  illegal: 'Contenu illégal',
  offensive: 'Offensant',
  rgpd_personne: 'RGPD — visage non flouté',
  rgpd_plaque: 'RGPD — plaque visible',
  other: 'Autre',
}

const STATUS_TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'action_taken', label: 'Traités' },
  { value: 'dismissed', label: 'Rejetés' },
  { value: 'all', label: 'Tous' },
]

export default function AdminReseauModeration() {
  const [tab, setTab] = useState<ReportStatus | 'all'>('pending')
  const reports = useAdminReports(tab)
  const dismiss = useDismissReport()
  const hidePost = useHidePostAndResolve()
  const hideComment = useHideCommentAndResolve()
  const unhide = useUnhidePost()

  const list = reports.data ?? []

  return (
    <div className="p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">
            Réseau social
          </p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
            Modération
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
          <ShieldAlert size={14} />
          <span>
            <strong>{list.filter((r) => r.status === 'pending').length}</strong>{' '}
            signalement{list.length > 1 ? 's' : ''} en attente
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reports.isLoading && (
        <p className="text-sm text-slate-400 text-center py-12">Chargement…</p>
      )}

      {!reports.isLoading && list.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/30 p-12 text-center">
          <Check size={32} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aucun signalement</p>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'pending'
              ? 'Aucun contenu signalé en attente de modération.'
              : `Aucun signalement avec le statut "${tab}".`}
          </p>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-3">
        {list.map((r) => {
          const isPostReport = r.reported_post_id !== null
          const target = isPostReport ? r.post : null
          const isHidden = target?.is_hidden ?? false
          const canHide = r.status === 'pending' && (target || r.comment_body)

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <header className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-red-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    {REASON_LABELS[r.reason] ?? r.reason}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      r.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : r.status === 'action_taken'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'dismissed'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-cyan-100 text-cyan-700'
                    }`}
                  >
                    {r.status}
                  </span>
                  {isHidden && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700">
                      <EyeOff size={10} /> caché
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  {new Date(r.created_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </header>

              <div className="p-5 space-y-3">
                {/* Comment du reporter */}
                {r.comment && (
                  <div className="text-xs text-slate-600 bg-amber-50/40 border border-amber-200/50 rounded-lg p-2 italic">
                    « {r.comment} »
                  </div>
                )}

                {/* Cible : post */}
                {isPostReport && target && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Post signalé · {target.post_type.replace(/_/g, ' ')}
                    </p>
                    {target.body ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{target.body}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">(pas de texte)</p>
                    )}
                    {target.media_urls.length > 0 && (
                      <p className="text-xs text-cyan-700 inline-flex items-center gap-1 mt-2">
                        <ImageIcon size={12} />
                        {target.media_urls.length} média{target.media_urls.length > 1 ? 's' : ''} (Storage privé)
                      </p>
                    )}
                  </div>
                )}

                {/* Cible : comment */}
                {!isPostReport && r.comment_body && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Commentaire signalé
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{r.comment_body}</p>
                  </div>
                )}

                {!target && !r.comment_body && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <AlertCircle size={12} />
                    Le contenu signalé n'est plus accessible (supprimé).
                  </div>
                )}

                {r.action_taken && (
                  <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <Check size={12} /> Action : {r.action_taken}
                  </p>
                )}

                {/* Actions */}
                {canHide && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => dismiss.mutate(r.id)}
                      disabled={dismiss.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                      <X size={12} /> Rejeter le signalement
                    </button>

                    {isPostReport && target && !isHidden && (
                      <button
                        onClick={() =>
                          hidePost.mutate({
                            reportId: r.id,
                            postId: target.id,
                            reason: REASON_LABELS[r.reason] ?? r.reason,
                          })
                        }
                        disabled={hidePost.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-semibold transition"
                      >
                        <EyeOff size={12} /> Cacher le post
                      </button>
                    )}

                    {!isPostReport && r.reported_comment_id && (
                      <button
                        onClick={() =>
                          hideComment.mutate({
                            reportId: r.id,
                            commentId: r.reported_comment_id as string,
                            reason: REASON_LABELS[r.reason] ?? r.reason,
                          })
                        }
                        disabled={hideComment.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-semibold transition"
                      >
                        <EyeOff size={12} /> Cacher le commentaire
                      </button>
                    )}
                  </div>
                )}

                {/* Réversion : post déjà caché */}
                {isHidden && target && (
                  <button
                    onClick={() => unhide.mutate(target.id)}
                    disabled={unhide.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
                  >
                    <Eye size={12} /> Réafficher le post
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
