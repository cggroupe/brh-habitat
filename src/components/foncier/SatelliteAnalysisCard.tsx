/**
 * Phase 19 Sprint D — Carte analyse Vision IA toiture.
 */
import { Eye, Loader2, RefreshCcw, AlertCircle, Sun, Compass, Home } from 'lucide-react'
import { useCachedSatellite, useAnalyzeSatellite } from '@/hooks/queries/foncier-ia'

const TYPE_TOITURE_LABELS: Record<string, string> = {
  tuile_mecanique: 'Tuile mécanique',
  ardoise: 'Ardoise',
  tuile_canal: 'Tuile canal',
  zinc: 'Zinc',
  tole: 'Tôle',
  terrasse: 'Terrasse',
  autre: 'Autre',
  indetermine: 'Indéterminé',
}

const ETAT_BADGE: Record<string, { label: string; cls: string }> = {
  neuf: { label: 'Neuf', cls: 'bg-emerald-100 text-emerald-700' },
  bon: { label: 'Bon état', cls: 'bg-emerald-50 text-emerald-700' },
  a_renover: { label: 'À rénover', cls: 'bg-amber-100 text-amber-700' },
  degrade: { label: 'Dégradé', cls: 'bg-red-100 text-red-700' },
  indetermine: { label: 'Indéterminé', cls: 'bg-slate-100 text-slate-500' },
}

const PV_BADGE: Record<string, { label: string; cls: string }> = {
  excellent: { label: 'PV excellent', cls: 'bg-emerald-600 text-white' },
  bon: { label: 'PV bon', cls: 'bg-emerald-100 text-emerald-700' },
  moyen: { label: 'PV moyen', cls: 'bg-amber-100 text-amber-700' },
  faible: { label: 'PV faible', cls: 'bg-slate-100 text-slate-500' },
  indetermine: { label: 'PV indéterminé', cls: 'bg-slate-100 text-slate-400' },
}

interface SatelliteAnalysisCardProps {
  parcelleIdu: string
  compact?: boolean
}

export default function SatelliteAnalysisCard({ parcelleIdu, compact = false }: SatelliteAnalysisCardProps) {
  const cached = useCachedSatellite(parcelleIdu)
  const analyze = useAnalyzeSatellite()

  const sat = cached.data

  function handleRun(force = false) {
    analyze.mutate({ parcelleIdu, forceRefresh: force })
  }

  if (!sat && !cached.isLoading && !analyze.isPending) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-cyan-200 p-3 text-center">
        <Eye size={20} className="mx-auto text-cyan-500 mb-1.5" />
        <p className="text-xs font-semibold text-slate-700">Analyse Vision IA toiture</p>
        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs mx-auto">
          Crop aérien IGN BD ORTHO → Claude Sonnet vision : type, orientation, surface, potentiel PV.
        </p>
        <button
          onClick={() => handleRun(false)}
          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition"
        >
          <Eye size={12} /> Analyser la toiture
        </button>
        {analyze.isError && (
          <p className="text-[10px] text-red-600 mt-1.5 inline-flex items-center gap-1">
            <AlertCircle size={10} />
            {String(analyze.error)}
          </p>
        )}
      </div>
    )
  }

  if (cached.isLoading || analyze.isPending) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
        <Loader2 size={18} className="mx-auto text-cyan-500 animate-spin mb-1" />
        <p className="text-xs text-slate-600">
          {analyze.isPending ? 'Analyse Vision IA en cours (5-15s)…' : 'Chargement…'}
        </p>
      </div>
    )
  }

  if (!sat) return null

  const a = sat.analysis
  const etat = a.etat_apparent ? ETAT_BADGE[a.etat_apparent] ?? null : null
  const pv = a.potentiel_pv ? PV_BADGE[a.potentiel_pv] ?? null : null

  return (
    <div className={`bg-white rounded-xl border border-cyan-200 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-cyan-600" />
          <p className="font-semibold text-slate-800">Toiture vue IA</p>
        </div>
        <button
          onClick={() => handleRun(true)}
          disabled={analyze.isPending}
          className="text-[10px] text-slate-400 hover:text-cyan-600 transition"
          title="Re-analyser"
        >
          <RefreshCcw size={10} />
        </button>
      </div>

      {/* Badges principaux */}
      <div className="flex flex-wrap gap-1.5">
        {a.type_toiture && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">
            <Home size={10} />
            {TYPE_TOITURE_LABELS[a.type_toiture] ?? a.type_toiture}
          </span>
        )}
        {etat && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${etat.cls}`}>
            {etat.label}
          </span>
        )}
        {pv && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${pv.cls}`}>
            <Sun size={10} className="inline" /> {pv.label}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {a.nb_pans !== null && (
          <div className="bg-slate-50 rounded-md px-2 py-1.5">
            <p className="text-[10px] text-slate-500">Pans</p>
            <p className="font-semibold text-slate-800">{a.nb_pans}</p>
          </div>
        )}
        {a.orientation_principale && (
          <div className="bg-slate-50 rounded-md px-2 py-1.5">
            <p className="text-[10px] text-slate-500 inline-flex items-center gap-0.5">
              <Compass size={9} /> Orient.
            </p>
            <p className="font-semibold text-slate-800">{a.orientation_principale}</p>
          </div>
        )}
        {a.surface_estimee_m2 !== null && (
          <div className="bg-slate-50 rounded-md px-2 py-1.5">
            <p className="text-[10px] text-slate-500">Surface</p>
            <p className="font-semibold text-slate-800">{a.surface_estimee_m2} m²</p>
          </div>
        )}
        {a.veluxes_visibles !== null && a.veluxes_visibles > 0 && (
          <div className="bg-slate-50 rounded-md px-2 py-1.5 col-span-3">
            <p className="text-[10px] text-slate-500">Veluxes visibles</p>
            <p className="font-semibold text-slate-800">{a.veluxes_visibles}</p>
          </div>
        )}
      </div>

      {a.ombre_solaire && a.ombre_solaire !== 'indetermine' && (
        <p className="text-[11px] text-slate-600 inline-flex items-center gap-1">
          <Sun size={11} className="text-amber-500" />
          Ombre solaire : <strong>{a.ombre_solaire}</strong>
        </p>
      )}

      {a.commentaires && (
        <p className="text-xs text-slate-600 italic bg-slate-50/60 p-2 rounded-lg">
          "{a.commentaires}"
        </p>
      )}

      <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
        {sat.ai_model} · {sat.ai_cost_eur_cents !== null && `${(sat.ai_cost_eur_cents / 100).toFixed(2)} €`} · BBOX {sat.bbox_meters}m
      </div>
    </div>
  )
}
