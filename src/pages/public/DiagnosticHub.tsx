/**
 * DiagnosticHub — Page d'entrée `/diagnostic`.
 *
 * UX spec Philippe : « On arrive sur /diagnostic, on sélectionne son problème
 * et on propose 2 éléments — le diagnostic rapide existant OU un diagnostic
 * plus complet 25-30 min qui demande une création de compte pour voir le
 * résultat. »
 *
 * Tout sur UNE page (pas de 2-step) :
 *   - Header + 6 cases à cocher (situation)
 *   - 2 cards (Rapide / Complet) avec badge « Recommandé » dynamique
 *     selon les problèmes cochés
 *   - Liens propagés en query string `?p=humidite,vente,...` pour que les
 *     deux modes puissent (futur V2) personnaliser leur sortie
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Snowflake,
  Sun,
  Euro,
  Droplets,
  AlertTriangle,
  Home as HomeIcon,
  CheckCircle2,
  Microscope,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

interface Problem {
  id: string
  label: string
  description: string
  Icon: typeof Snowflake
  /** Si true, sélectionner ce pb pousse vers le mode complet. */
  needsDeepAudit: boolean
}

const PROBLEMS: Problem[] = [
  { id: 'froid', label: "Trop froid l'hiver", description: 'Murs froids, courants d\'air', Icon: Snowflake, needsDeepAudit: false },
  { id: 'chaud', label: "Trop chaud l'été", description: 'Mansardes invivables, inconfort', Icon: Sun, needsDeepAudit: false },
  { id: 'factures', label: "Factures d'énergie élevées", description: 'Factures qui dépassent 2-3 000 €/an', Icon: Euro, needsDeepAudit: false },
  { id: 'humidite', label: 'Humidité, moisissure', description: 'Condensation, taches noires', Icon: Droplets, needsDeepAudit: false },
  { id: 'loi_climat', label: 'DPE F ou G (Loi Climat)', description: 'Interdiction location 2025-2028', Icon: AlertTriangle, needsDeepAudit: true },
  { id: 'vente', label: 'Préparer la vente / location', description: 'Estimer l\'impact DPE, prévoir travaux', Icon: HomeIcon, needsDeepAudit: true },
]

export default function DiagnosticHub() {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const needsComplet = useMemo(
    () => selected.some((id) => PROBLEMS.find((p) => p.id === id)?.needsDeepAudit),
    [selected],
  )
  const recommended: 'complet' | 'rapide' = needsComplet ? 'complet' : 'rapide'
  const queryParam = selected.length > 0 ? `?p=${encodeURIComponent(selected.join(','))}` : ''
  const hasSelection = selected.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Header */}
        <header className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Sparkles size={11} /> Diagnostic énergie BRH
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Qu'est-ce qui vous préoccupe&nbsp;?
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Cochez les situations qui s'appliquent à votre logement. On vous propose ensuite
            le format de diagnostic le plus adapté&nbsp;: rapide ou approfondi.
          </p>
        </header>

        {/* Cases à cocher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {PROBLEMS.map((p) => {
            const sel = selected.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={sel}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  sel
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    sel ? 'bg-white/10' : 'bg-slate-50'
                  }`}>
                    <p.Icon size={20} className={sel ? 'text-white' : 'text-slate-700'} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">{p.label}</p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${sel ? 'text-white/70' : 'text-slate-500'}`}>
                      {p.description}
                    </p>
                  </div>
                  {sel && <CheckCircle2 size={16} className="text-white shrink-0 mt-0.5" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Hint si rien coché */}
        {!hasSelection && (
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-500">
              Cochez au moins une situation ci-dessus pour voir les options de diagnostic.
              Ou démarrez directement sans préciser ↓
            </p>
          </div>
        )}

        {/* 2 propositions */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity ${hasSelection ? 'opacity-100' : 'opacity-60'}`}>
          {/* Diagnostic RAPIDE (existant 5 étapes) */}
          <Link
            to={`/diagnostic/rapide${queryParam}`}
            className={`group relative rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg flex flex-col ${
              hasSelection && recommended === 'rapide' ? 'border-emerald-600' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            {hasSelection && recommended === 'rapide' && (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={10} /> Recommandé pour vous
              </span>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap size={22} className="text-emerald-700" strokeWidth={2} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                5-10 minutes
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">
              Diagnostic rapide
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
              {hasSelection && recommended === 'rapide'
                ? 'Pour votre situation, un premier diagnostic en 5-10 minutes suffit. Vous obtenez un score de santé énergétique + des préconisations actionnables.'
                : 'Un premier diagnostic en 5-10 minutes. Vous obtenez un score de santé énergétique + des préconisations actionnables. Sans création de compte.'}
            </p>
            <ul className="space-y-1.5 mb-5">
              {[
                'Wizard guidé en 5 étapes simples',
                'Pas de saisie technique requise',
                'Résultats immédiats sans compte',
                'Possibilité de prendre RDV avec un pro',
              ].map((f) => (
                <li key={f} className="text-xs text-slate-700 inline-flex items-start gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <span className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white text-sm font-bold transition ${
              hasSelection && recommended === 'rapide' ? 'bg-emerald-700 group-hover:bg-emerald-800' : 'bg-slate-700 group-hover:bg-slate-800'
            }`}>
              Démarrer le diagnostic rapide <ArrowRight size={14} />
            </span>
          </Link>

          {/* Audit COMPLET (25-30 min, lead-gating login) */}
          <Link
            to={`/audit-complet${queryParam}`}
            className={`group relative rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg flex flex-col ${
              hasSelection && recommended === 'complet' ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            {hasSelection && recommended === 'complet' && (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={10} /> Recommandé pour vous
              </span>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Microscope size={22} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                25-30 minutes
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">
              Audit énergétique complet
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
              {hasSelection && recommended === 'complet'
                ? 'Pour votre situation (Loi Climat / préparer la vente), un audit précis est nécessaire. Saisie détaillée façade par façade, fenêtre par fenêtre.'
                : 'Saisie détaillée façade par façade, fenêtre par fenêtre, équipements précis. Étiquette DPE 3CL officielle + chiffrage personnalisé.'}
            </p>
            <ul className="space-y-1.5 mb-5">
              {[
                'Wizard 8 étapes profondes',
                'Étiquette DPE 3CL officielle (méthode ADEME)',
                'Création de compte requise pour le résultat',
                'Sauvegarde locale à chaque étape',
              ].map((f) => (
                <li key={f} className="text-xs text-slate-700 inline-flex items-start gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <span className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white text-sm font-bold transition ${
              hasSelection && recommended === 'complet' ? 'bg-slate-900 group-hover:bg-slate-800' : 'bg-slate-700 group-hover:bg-slate-800'
            }`}>
              Lancer l'audit complet <ArrowRight size={14} />
            </span>
          </Link>
        </div>

        {/* Garanties */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="text-sm text-slate-600">
            <p className="font-bold text-slate-900">Calcul officiel 3CL-DPE 2021</p>
            <p className="text-xs">Validé sur 99 DPE réels ADEME</p>
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-bold text-slate-900">Aucune donnée vendue</p>
            <p className="text-xs">Vos infos restent chez vous</p>
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-bold text-slate-900">100% gratuit</p>
            <p className="text-xs">Aucune carte bancaire demandée</p>
          </div>
        </div>
      </div>
    </div>
  )
}
