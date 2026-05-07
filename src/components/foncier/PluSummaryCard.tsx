/**
 * Phase 19 Sprint D — Carte résumé PLUi (Claude Sonnet 4.6).
 */
import { Building, Sparkles, Loader2, RefreshCcw, AlertCircle, ExternalLink } from 'lucide-react'
import { useCachedPlu, useSummarizePlu } from '@/hooks/queries/foncier-ia'

interface PluSummaryCardProps {
  codeInsee: string
  compact?: boolean
}

export default function PluSummaryCard({ codeInsee, compact = false }: PluSummaryCardProps) {
  const cached = useCachedPlu(codeInsee)
  const summarize = useSummarizePlu()

  const plu = cached.data

  function handleRun(force = false) {
    summarize.mutate({ codeInsee, forceRefresh: force })
  }

  // Pas encore de résumé : bouton de lancement
  if (!plu && !cached.isLoading && !summarize.isPending) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-violet-200 p-3 text-center">
        <Sparkles size={20} className="mx-auto text-violet-500 mb-1.5" />
        <p className="text-xs font-semibold text-slate-700">Résumé PLUi via IA</p>
        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs mx-auto">
          Claude Sonnet 4.6 lit le règlement officiel et extrait zones, hauteurs max, ABF, etc.
        </p>
        <button
          onClick={() => handleRun(false)}
          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
        >
          <Sparkles size={12} /> Analyser le PLU
        </button>
        {summarize.isError && (
          <p className="text-[10px] text-red-600 mt-1.5 inline-flex items-center gap-1">
            <AlertCircle size={10} />
            {String(summarize.error)}
          </p>
        )}
      </div>
    )
  }

  if (cached.isLoading || summarize.isPending) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
        <Loader2 size={18} className="mx-auto text-violet-500 animate-spin mb-1" />
        <p className="text-xs text-slate-600">
          {summarize.isPending ? 'Analyse PLU en cours (10-30s)…' : 'Chargement…'}
        </p>
      </div>
    )
  }

  if (!plu) return null

  const s = plu.summary

  return (
    <div className={`bg-white rounded-xl border border-violet-200 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building size={16} className="text-violet-600" />
          <p className="font-semibold text-slate-800">
            Résumé PLUi
            <span className="ml-1.5 text-[10px] font-bold uppercase bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
              {plu.gpu_document_type ?? 'PLU'}
            </span>
          </p>
        </div>
        <button
          onClick={() => handleRun(true)}
          disabled={summarize.isPending}
          className="text-[10px] text-slate-400 hover:text-violet-600 transition inline-flex items-center gap-0.5"
          title="Re-analyser (force refresh)"
        >
          <RefreshCcw size={10} />
        </button>
      </div>

      {/* Synthèse */}
      {s.synthese && (
        <p className="text-xs text-slate-700 leading-relaxed bg-violet-50/40 p-2 rounded-lg italic">
          "{s.synthese}"
        </p>
      )}

      {/* Zones principales */}
      {s.zones_principales && s.zones_principales.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
            Zones principales
          </h3>
          <div className="space-y-1.5">
            {s.zones_principales.slice(0, 5).map((z, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono font-bold text-violet-700 shrink-0 bg-violet-50 px-1.5 py-0.5 rounded">
                  {z.code}
                </span>
                <div className="flex-1 min-w-0">
                  {z.libelle && <p className="text-slate-700">{z.libelle}</p>}
                  <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-slate-500">
                    {z.hauteur_max_m !== null && <span>H ≤ {z.hauteur_max_m}m</span>}
                    {z.cos !== null && <span>COS {z.cos}</span>}
                    {z.emprise_au_sol_pct !== null && <span>ES {z.emprise_au_sol_pct}%</span>}
                    {z.parking_min && <span>{z.parking_min}</span>}
                  </div>
                  {z.particularites && (
                    <p className="text-[10px] text-amber-700 mt-0.5">⚠ {z.particularites}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABF zones */}
      {s.abf_zones && s.abf_zones.length > 0 && (
        <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-200/60">
          <strong>⚠ Zones ABF :</strong> {s.abf_zones.join(' · ')}
        </div>
      )}

      {/* Mentions */}
      {s.mentions_obligatoires && s.mentions_obligatoires.length > 0 && !compact && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Mentions obligatoires
          </h3>
          <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
            {s.mentions_obligatoires.slice(0, 5).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] text-slate-400">
        <span>
          {plu.ai_model} · {plu.ai_cost_eur_cents !== null && `${(plu.ai_cost_eur_cents / 100).toFixed(2)} €`}
          {plu.gpu_document_date && ` · approuvé ${new Date(plu.gpu_document_date).getFullYear()}`}
        </span>
        {plu.gpu_pdf_url && (
          <a
            href={plu.gpu_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 hover:text-violet-700 inline-flex items-center gap-0.5"
          >
            PDF source <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  )
}
