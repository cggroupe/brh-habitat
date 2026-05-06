/**
 * Phase 18.8 — Recommandations AUTAF read-only sur profil pro BRH.
 *
 * Affiche les recommandations AUTAF si le pro a un brh_autaf_link actif.
 * Fallback gracieux si AUTAF API indisponible (Genesii pas encore livré).
 */
import { ExternalLink, Award, AlertCircle } from 'lucide-react'
import { useAutafRecommendations } from '@/hooks/queries/reseau-autaf'

interface AutafRecommendationsProps {
  /** L'autaf_user_id du pro affiché (vient du brh_autaf_link de ce pro). */
  autafUserId: string | null
}

export default function AutafRecommendations({ autafUserId }: AutafRecommendationsProps) {
  const result = useAutafRecommendations(autafUserId)

  if (!autafUserId) return null

  if (result.isLoading) {
    return (
      <div className="text-xs text-slate-400 text-center py-4">Chargement AUTAF…</div>
    )
  }

  const data = result.data

  if (!data?.available) {
    return (
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 flex items-center gap-2 text-xs text-amber-800">
        <AlertCircle size={14} />
        <span>
          Recommandations AUTAF indisponibles
          {data?.error ? ` (${data.error})` : ''}
        </span>
      </div>
    )
  }

  if (data.recommendations.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-3">
        Pas encore de recommandations AUTAF.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-bold uppercase tracking-wide">
          <ExternalLink size={10} />
          via AUTAF
        </span>
        <span className="text-slate-500">{data.recommendations.length} recommandations</span>
      </div>
      <ul className="space-y-2">
        {data.recommendations.map((r) => (
          <li
            key={r.id}
            className="bg-white rounded-xl border border-violet-200/40 p-3 text-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award size={14} className="text-violet-600" />
              {r.metier && (
                <span className="text-[11px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md font-medium">
                  {r.metier.replace(/_/g, ' ')}
                </span>
              )}
              {r.author_name && (
                <span className="text-xs text-slate-600">par {r.author_name}</span>
              )}
            </div>
            {r.body && <p className="text-sm text-slate-700 italic">"{r.body}"</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
