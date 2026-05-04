/**
 * Phase 16 — Panneau détail prospect agence (slide-over).
 *
 * Affiche tout ce qu'une agence doit savoir avant de claim un lead :
 * adresse complète, DPE, conso, surface, prédiction travaux + aides.
 */
import { X, MapPin, Home, Zap, Calendar, Euro, Wrench, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ScoreVenteRow } from '@/api/score-vente'
import { predictWorks, formatEur } from '@/lib/predict-works'

const SEGMENT_LABELS: Record<string, string> = {
  tres_chaud: 'Très chaud',
  chaud: 'Chaud',
  tiede: 'Tiède',
  froid: 'Froid',
}

const ENERGIE_LABELS: Record<string, string> = {
  fioul: 'Fioul',
  gaz: 'Gaz',
  electricite: 'Électricité',
  bois: 'Bois',
  reseau: 'Réseau de chaleur',
}

function libelleEnergie(s: string | null): string {
  if (!s) return 'Inconnu'
  const lower = s.toLowerCase()
  for (const [k, v] of Object.entries(ENERGIE_LABELS)) {
    if (lower.includes(k)) return v
  }
  return s
}

interface Props {
  row: ScoreVenteRow
  onClose: () => void
  onClaim: () => void
  alreadyClaimed: boolean
  quotaExhausted: boolean
  isClaiming: boolean
}

export function ProspectDetailPanel({
  row,
  onClose,
  onClaim,
  alreadyClaimed,
  quotaExhausted,
  isClaiming,
}: Props) {
  const p = row.prospect
  if (!p) return null

  const adresse = p.adresse_ban || p.adresse || 'Adresse non renseignée'
  const construction = p.annee_construction
    ? `${p.annee_construction} (${p.periode_construction ?? '?'})`
    : p.periode_construction ?? 'Inconnu'

  const prediction = predictWorks({
    surface_habitable: p.surface_habitable,
    etiquette_dpe: p.etiquette_dpe,
    energie_chauffage: p.energie_chauffage,
    isolation_murs: p.isolation_murs,
    isolation_toiture_detail: p.isolation_toiture_detail,
    type_ventilation: p.type_ventilation,
    annee_construction: p.annee_construction,
    type_batiment: p.type_batiment,
  })

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    row.segment === 'tres_chaud'
                      ? 'bg-red-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {row.segment ? SEGMENT_LABELS[row.segment] : '—'}
                </span>
                <span className="text-3xl font-bold tabular-nums">{row.score}</span>
                <span className="text-sm text-slate-400">/ 100</span>
              </div>
              <p className="text-base text-white/95 truncate" title={adresse}>
                <MapPin size={14} className="inline mr-1" />
                {adresse}
              </p>
              <p className="text-xs text-slate-400">
                {p.code_postal} · {p.commune} · Dept {p.departement}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Stat label="Probabilité 6m" value={row.proba_6m != null ? `${Math.round(row.proba_6m * 100)} %` : '—'} />
            <Stat label="Saut DPE potentiel" value={`${p.etiquette_dpe} → ${prediction.saut_dpe_estime}`} />
          </div>
        </div>

        {/* Caractéristiques bien */}
        <section className="p-5 border-b border-slate-100">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">
            Caractéristiques du logement
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field icon={<Home size={14} />} label="Type" value={p.type_batiment ?? '—'} />
            <Field
              icon={<Calendar size={14} />}
              label="Construction"
              value={construction}
            />
            <Field
              icon={<Home size={14} />}
              label="Surface"
              value={p.surface_habitable ? `${p.surface_habitable} m²` : '—'}
            />
            <Field
              icon={<Calendar size={14} />}
              label="Dernier DPE"
              value={p.date_dpe ? new Date(p.date_dpe).toLocaleDateString('fr-FR') : '—'}
            />
          </div>
        </section>

        {/* Performance énergétique */}
        <section className="p-5 border-b border-slate-100">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">
            Performance énergétique actuelle
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <DpeBadge label="Étiquette énergie" value={p.etiquette_dpe} />
            <DpeBadge label="Étiquette GES" value={p.etiquette_ges} />
            <Field
              icon={<Zap size={14} />}
              label="Consommation"
              value={p.conso_m2_ep ? `${Math.round(p.conso_m2_ep)} kWh/m²/an` : '—'}
            />
            <Field
              icon={<Zap size={14} />}
              label="Énergie chauffage"
              value={libelleEnergie(p.energie_chauffage)}
            />
            <Field
              icon={<Zap size={14} />}
              label="Énergie ECS"
              value={libelleEnergie(p.energie_ecs)}
            />
            <Field
              icon={<Euro size={14} />}
              label="Coût annuel"
              value={p.cout_energie_annuel ? formatEur(Math.round(p.cout_energie_annuel)) : '—'}
            />
          </div>
        </section>

        {/* Prédiction travaux */}
        <section className="p-5 border-b border-slate-100">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3 flex items-center gap-2">
            <Wrench size={14} />
            Travaux conseillés (heuristique BRH)
          </h3>
          {prediction.works.length === 0 ? (
            <p className="text-sm text-slate-500">Pas de travaux prioritaires identifiés.</p>
          ) : (
            <div className="space-y-2">
              {prediction.works.map((w) => (
                <div
                  key={w.geste}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      w.priorite === 'haute'
                        ? 'bg-red-500'
                        : w.priorite === 'moyenne'
                        ? 'bg-orange-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{w.label}</p>
                      <p className="font-mono text-xs tabular-nums whitespace-nowrap">
                        {formatEur(w.cout_ttc_eur)}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{w.raison}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Aides estimées : {formatEur(w.aides_estimees_eur)} · reste à charge{' '}
                      {formatEur(w.reste_charge_eur)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-emerald-900">
                    Total scénario rénovation
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-emerald-800">
                    <div>
                      <p className="text-[10px] uppercase">Coût TTC</p>
                      <p className="font-bold tabular-nums">{formatEur(prediction.total_cout_ttc)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase">Aides</p>
                      <p className="font-bold tabular-nums">{formatEur(prediction.total_aides)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase">Reste à charge</p>
                      <p className="font-bold tabular-nums">{formatEur(prediction.total_reste_charge)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Estimations forfaitaires Bretagne 2026, profil MPR « Bleu » (revenus
                modestes). Audit personnalisé par un Pro RGE recommandé.
              </p>
            </div>
          )}
        </section>

        {/* Score breakdown */}
        {row.rules_breakdown && Object.keys(row.rules_breakdown).length > 0 ? (
          <section className="p-5 border-b border-slate-100">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">
              Détail du score
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(row.rules_breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-600">{labelRule(k)}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      v > 0 ? 'text-emerald-700' : v < 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {v > 0 ? '+' : ''}
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Action footer */}
        <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex items-center gap-3">
          {alreadyClaimed ? (
            <div className="flex-1 flex items-center gap-2 text-slate-500 text-sm">
              <Lock size={16} />
              Lead déjà réservé par une agence
            </div>
          ) : quotaExhausted ? (
            <div className="flex-1 flex items-center gap-2 text-amber-700 text-sm">
              <AlertTriangle size={16} />
              Quota mensuel atteint
            </div>
          ) : (
            <>
              <p className="flex-1 text-xs text-slate-500">
                Claim = exclusivité 30 jours · max 2 tentatives
              </p>
              <button
                type="button"
                onClick={onClaim}
                disabled={isClaiming}
                className="px-5 py-2.5 bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
              >
                {isClaiming ? 'Claim en cours…' : 'Claim ce lead'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-md px-2 py-1">
      <span className="text-slate-400 mr-1">{label}:</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  )
}

function DpeBadge({ label, value }: { label: string; value: string | null }) {
  const colors: Record<string, string> = {
    A: 'bg-emerald-500',
    B: 'bg-emerald-400',
    C: 'bg-yellow-400',
    D: 'bg-yellow-500',
    E: 'bg-orange-500',
    F: 'bg-red-500',
    G: 'bg-red-700',
  }
  const bg = value ? colors[value] ?? 'bg-slate-300' : 'bg-slate-200'
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <span
        className={`inline-flex items-center justify-center w-10 h-8 rounded-md text-white font-bold text-sm mt-0.5 ${bg}`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

function labelRule(k: string): string {
  const labels: Record<string, string> = {
    dpe_base: 'DPE F/G',
    dpe_age: 'DPE > 5 ans',
    surface: 'Surface',
    maison_indiv: 'Maison individuelle',
    bretagne_bonus: 'Zone Bretagne',
    collectif_penalite: 'Chauffage collectif',
    pre_75: 'Construction < 1975',
  }
  return labels[k] ?? k
}
