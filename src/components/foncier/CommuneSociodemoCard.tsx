/**
 * Phase 19 Sprint C — Carte sociodémo d'une commune (loyers + politique + Filosofi + gentrification).
 */
import { Loader2, Users2, TrendingUp, Home, MapPin, Vote, Euro, AlertCircle } from 'lucide-react'
import { useCommuneSociodemo, useDvfStats } from '@/hooks/queries/foncier-sociodemo'

const GENTRIF_BADGE: Record<string, { label: string; cls: string }> = {
  indetermine: { label: 'Données DVF non chargées', cls: 'bg-slate-50 text-slate-500 border border-slate-200' },
  declin: { label: 'En déclin', cls: 'bg-slate-100 text-slate-600' },
  stable: { label: 'Stable', cls: 'bg-slate-100 text-slate-700' },
  dynamique: { label: 'Dynamique', cls: 'bg-emerald-100 text-emerald-700' },
  en_gentrification: { label: 'En gentrification', cls: 'bg-amber-100 text-amber-700' },
  gentrifiee: { label: 'Gentrifiée', cls: 'bg-orange-100 text-orange-700' },
  tres_gentrifiee: { label: 'Très gentrifiée', cls: 'bg-red-100 text-red-700' },
}

interface CommuneSociodemoCardProps {
  codeInsee: string
  compact?: boolean
}

export default function CommuneSociodemoCard({ codeInsee, compact = false }: CommuneSociodemoCardProps) {
  const sociodemo = useCommuneSociodemo(codeInsee)
  const dvfStats = useDvfStats(codeInsee, 5)

  if (sociodemo.isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" /> Chargement sociodémo…
      </div>
    )
  }

  if (sociodemo.isError || !sociodemo.data) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
        <AlertCircle size={12} />
        Sociodémo indisponible pour cette commune.
      </div>
    )
  }

  const c = sociodemo.data
  const gentrif = c.gentrification_label ? GENTRIF_BADGE[c.gentrification_label] : null
  const stats = dvfStats.data

  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-600" />
            {c.nom_commune}
            {c.code_postal && <span className="text-xs text-slate-500 font-normal">· {c.code_postal}</span>}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            INSEE {c.code_insee}
            {c.departement && ` · Dépt ${c.departement}`}
            {c.population && ` · ${c.population.toLocaleString('fr-FR')} hab.`}
          </p>
        </div>
        {gentrif && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${gentrif.cls}`}>
            {gentrif.label}
            {c.gentrification_score !== null && (
              <span className="font-mono ml-1 opacity-70">{c.gentrification_score}</span>
            )}
          </span>
        )}
      </div>

      {/* Loyers */}
      {(c.loyer_appartement_eur_cents || c.loyer_maison_eur_cents) && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 inline-flex items-center gap-1">
            <Euro size={10} /> Loyers indicatifs
            {c.loyer_source_year && (
              <span className="text-[9px] text-slate-400 font-normal">({c.loyer_source_year})</span>
            )}
            <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-1 py-0.5 rounded ml-1">
              moyenne dépt
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {c.loyer_appartement_eur_cents !== null && (
              <div className="bg-slate-50 rounded-md px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Appartement</p>
                <p className="font-semibold text-slate-800">
                  {(c.loyer_appartement_eur_cents / 100).toFixed(2)} €/m²
                </p>
              </div>
            )}
            {c.loyer_maison_eur_cents !== null && (
              <div className="bg-slate-50 rounded-md px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Maison</p>
                <p className="font-semibold text-slate-800">
                  {(c.loyer_maison_eur_cents / 100).toFixed(2)} €/m²
                </p>
              </div>
            )}
          </div>
          <p className="text-[9px] text-slate-400 mt-1 italic">
            Indicatif moyenne départementale — précision par quartier en cours d'enrichissement.
          </p>
        </div>
      )}

      {/* DVF stats */}
      {stats && stats.total_mutations > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 inline-flex items-center gap-1">
            <TrendingUp size={10} /> Marché DVF (5 ans)
          </h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-emerald-50 rounded-md px-2 py-1.5">
              <p className="text-[10px] text-emerald-700">Mutations</p>
              <p className="font-semibold text-emerald-900">{stats.total_mutations}</p>
            </div>
            {stats.prix_median_eur_cents !== null && (
              <div className="bg-slate-50 rounded-md px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Prix médian</p>
                <p className="font-semibold text-slate-800">
                  {(stats.prix_median_eur_cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                </p>
              </div>
            )}
            {stats.surface_median_m2 !== null && (
              <div className="bg-slate-50 rounded-md px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Surface méd.</p>
                <p className="font-semibold text-slate-800">{stats.surface_median_m2} m²</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Politique / élus (V1 placeholder) */}
      {c.maire_nom && (
        <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
          <p className="inline-flex items-center gap-1.5">
            <Vote size={11} className="text-slate-400" />
            <strong>{c.maire_prenom} {c.maire_nom}</strong>
            {c.maire_parti && <span className="text-slate-500">— {c.maire_parti}</span>}
          </p>
        </div>
      )}

      {/* Filosofi (V1 placeholder) */}
      {c.revenu_median_disponible_eur_cents !== null && (
        <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 space-y-0.5">
          <p className="inline-flex items-center gap-1.5">
            <Users2 size={11} className="text-slate-400" />
            Revenu médian : <strong>{(c.revenu_median_disponible_eur_cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/UC</strong>
            {c.decile_revenu_median !== null && (
              <span className="ml-1 text-slate-400">(décile D{c.decile_revenu_median})</span>
            )}
          </p>
          {c.pct_proprietaires !== null && (
            <p className="inline-flex items-center gap-1.5">
              <Home size={11} className="text-slate-400" />
              {c.pct_proprietaires}% propriétaires
              {c.pct_logements_avant_1975 !== null && ` · ${c.pct_logements_avant_1975}% logements avant 1975`}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
          Sources : geo.api.gouv.fr · INSEE Filosofi · CLAMEUR (loyers fallback V1) · DVF Cerema · cache 90j
        </p>
      )}
    </div>
  )
}
