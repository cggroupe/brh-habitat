/**
 * Phase 18.7 — Carte offre de chantier dans la liste.
 */
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Euro, Users } from 'lucide-react'
import type { ChantierOffer } from '@/api/reseau-chantiers'

const MODE_LABELS: Record<string, string> = {
  sous_traitance: 'Sous-traitance',
  co_traitance: 'Co-traitance',
  apport: "Apport d'affaires",
}

interface ChantierCardProps {
  chantier: ChantierOffer
  /** Distance optionnelle calculée côté front (Haversine). */
  distanceKm?: number | null
  /** Métiers matchant côté front. */
  matchedMetiers?: string[]
  /** Nombre de candidatures (vue publisher uniquement). */
  applicationCount?: number
}

export default function ChantierCard({
  chantier,
  distanceKm,
  matchedMetiers,
  applicationCount,
}: ChantierCardProps) {
  const location = [chantier.commune, chantier.code_postal].filter(Boolean).join(' · ')
  const budget = chantier.budget_visible && chantier.budget_cents
    ? `${(chantier.budget_cents / 100).toLocaleString('fr-FR')} € HT`
    : null
  const startDate = chantier.start_date
    ? new Date(chantier.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <Link
      to={`/reseau/chantiers/${chantier.id}`}
      className="block bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-cyan-300 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-700">
            {MODE_LABELS[chantier.contract_mode] ?? chantier.contract_mode}
          </span>
        </div>
        {applicationCount !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
            <Users size={12} />
            {applicationCount}
          </span>
        )}
      </div>

      <h3 className="text-base font-display text-slate-800 mb-1 line-clamp-2">{chantier.title}</h3>

      {chantier.description && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{chantier.description}</p>
      )}

      {/* Métiers tags */}
      {chantier.metiers_recherches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chantier.metiers_recherches.map((m) => {
            const isMatched = matchedMetiers?.includes(m)
            return (
              <span
                key={m}
                className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                  isMatched ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-50 text-cyan-700'
                }`}
              >
                {m.replace(/_/g, ' ')}
                {isMatched && ' ✓'}
              </span>
            )
          })}
        </div>
      )}

      {/* Métadonnées */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {location}
            {distanceKm !== null && distanceKm !== undefined && (
              <span className="text-slate-400 ml-1">({Math.round(distanceKm)} km)</span>
            )}
          </span>
        )}
        {startDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            {startDate}
          </span>
        )}
        {budget && (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <Euro size={12} />
            {budget}
          </span>
        )}
        <span className="ml-auto text-cyan-700 font-semibold">
          Commission {chantier.commission_offer_pct}%
        </span>
      </div>
    </Link>
  )
}
