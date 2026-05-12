/**
 * SimulateurProbleme — 5 cases à cocher + page récap avec recommandation.
 *
 * Le user décrit sa situation (multiselect), on lui montre les 2 modes disponibles
 * avec un encart « recommandé pour votre cas » sur le plus pertinent, mais le
 * choix final lui revient (décision audit-ux-2026-05-12 #7).
 *
 * Règles de recommandation (visibles en transparence dans la page récap) :
 *   - Si "Loi Climat F/G" ou "Préparer la vente" coché → mode COMPLET recommandé
 *     (besoin d'un audit précis pour décider des travaux et négocier).
 *   - Sinon → mode RAPIDE recommandé (premier aperçu suffit).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
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
  {
    id: 'froid',
    label: 'Trop froid l\'hiver',
    description: 'Murs froids, ressenti désagréable, courants d\'air',
    Icon: Snowflake,
    needsDeepAudit: false,
  },
  {
    id: 'chaud',
    label: 'Trop chaud l\'été',
    description: 'Inconfort thermique l\'été, mansardes invivables',
    Icon: Sun,
    needsDeepAudit: false,
  },
  {
    id: 'factures',
    label: 'Factures d\'énergie élevées',
    description: 'Vos factures dépassent 2000-3000 € / an',
    Icon: Euro,
    needsDeepAudit: false,
  },
  {
    id: 'humidite',
    label: 'Humidité ou moisissure',
    description: 'Condensation, taches noires, problèmes de ventilation',
    Icon: Droplets,
    needsDeepAudit: false,
  },
  {
    id: 'loi_climat',
    label: 'Loi Climat — j\'ai un DPE F ou G',
    description: 'Interdiction de location 2025-2028, audit obligatoire pour vendre',
    Icon: AlertTriangle,
    needsDeepAudit: true,
  },
  {
    id: 'vente',
    label: 'Je prépare la vente ou la location',
    description: 'Besoin d\'estimer l\'impact DPE sur le prix, prévoir les travaux',
    Icon: HomeIcon,
    needsDeepAudit: true,
  },
]

export default function SimulateurProbleme() {
  const [selected, setSelected] = useState<string[]>([])
  const [showReco, setShowReco] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const needsComplet = selected.some((id) => PROBLEMS.find((p) => p.id === id)?.needsDeepAudit)
  const recommended: 'complet' | 'rapide' = needsComplet ? 'complet' : 'rapide'
  // Query string propagée vers les modes rapide et complet pour que les recos
  // soient adaptées aux problèmes cochés (cf retour Philippe 12/05).
  const queryParam = selected.length > 0 ? `?p=${encodeURIComponent(selected.join(','))}` : ''

  if (!showReco) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/simulateur"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft size={14} /> Retour
          </Link>

          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-widest mb-3">
              Étape 1 / 2 — Votre situation
            </span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Qu'est-ce qui vous préoccupe&nbsp;?
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Cochez tout ce qui s'applique à votre logement. Cela nous aide à vous
              orienter vers le bon niveau de simulation. <strong className="text-slate-900">Aucun engagement.</strong>
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {PROBLEMS.map((p) => {
              const sel = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={sel}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    sel
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      sel ? 'bg-white/10' : 'bg-slate-50'
                    }`}>
                      <p.Icon size={18} className={sel ? 'text-white' : 'text-slate-700'} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">{p.label}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${sel ? 'text-white/70' : 'text-slate-500'}`}>
                        {p.description}
                      </p>
                    </div>
                    {sel && <CheckCircle2 size={16} className="text-white shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowReco(true)}
            disabled={selected.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Voir mes options <ArrowRight size={14} />
          </button>
          {selected.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">Cochez au moins une situation pour continuer.</p>
          )}
        </div>
      </div>
    )
  }

  // Page récap
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          type="button"
          onClick={() => setShowReco(false)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={14} /> Modifier ma situation
        </button>

        <header className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-3">
            Étape 2 / 2 — Recommandation
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Pour votre cas, voici ce qu'on propose
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Vous avez coché&nbsp;: <strong className="text-slate-900">
              {selected.map((id) => PROBLEMS.find((p) => p.id === id)?.label).filter(Boolean).join(', ')}
            </strong>.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mode COMPLET */}
          <Link
            to={`/simulateur/complet${queryParam}`}
            className={`group relative rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg flex flex-col ${
              recommended === 'complet' ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            {recommended === 'complet' && (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={10} /> Recommandé pour votre cas
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
              <Microscope size={22} className="text-white" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Simulation complète</h2>
            <p className="text-xs text-slate-500 mb-3">25-30 minutes — précision maximale</p>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
              {recommended === 'complet'
                ? 'Vu votre cas (loi Climat ou vente à préparer), un audit détaillé est indispensable pour décider des travaux et négocier le prix.'
                : 'Optionnel pour vous, mais utile si vous voulez planifier des travaux ou demander des aides précises (MaPrimeRénov\' Ampleur).'}
            </p>
            <ul className="space-y-1 mb-5 text-xs text-slate-700">
              <li>• Étiquette DPE 3CL officielle</li>
              <li>• 5 scénarios de travaux chiffrés</li>
              <li>• Aides détaillées (MPR + CEE + ÉcoPTZ)</li>
            </ul>
            <span className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-slate-800 text-white text-sm font-bold transition">
              Lancer l'audit complet <ArrowRight size={14} />
            </span>
          </Link>

          {/* Mode RAPIDE */}
          <Link
            to={`/diagnostic/rapide${queryParam}`}
            className={`group relative rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg flex flex-col ${
              recommended === 'rapide' ? 'border-emerald-600' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            {recommended === 'rapide' && (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={10} /> Recommandé pour votre cas
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
              <Zap size={22} className="text-emerald-700" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Simulation rapide</h2>
            <p className="text-xs text-slate-500 mb-3">5 minutes — premier aperçu</p>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
              {recommended === 'rapide'
                ? 'Adapté pour votre cas — vous obtenez un premier aperçu en moins de 5 minutes (DPE actuel + projeté + aides éligibles).'
                : 'Plus rapide mais moins précis. Utile pour avoir un ordre de grandeur avant de basculer sur la simulation complète.'}
            </p>
            <ul className="space-y-1 mb-5 text-xs text-slate-700">
              <li>• Adresse + 3 infos foyer</li>
              <li>• DPE actuel + projeté</li>
              <li>• Aides MaPrimeRénov' éligibles</li>
            </ul>
            <span className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white text-sm font-bold transition ${
              recommended === 'rapide' ? 'bg-emerald-700 group-hover:bg-emerald-800' : 'bg-slate-700 group-hover:bg-slate-800'
            }`}>
              Démarrer la simulation rapide <ArrowRight size={14} />
            </span>
          </Link>
        </div>

        <p className="text-center mt-8 text-xs text-slate-500">
          Vous gardez toujours le choix. Vous pouvez basculer d'un mode à l'autre à tout moment.
        </p>
      </div>
    </div>
  )
}
