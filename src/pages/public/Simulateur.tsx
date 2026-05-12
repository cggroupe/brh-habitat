/**
 * Simulateur — Hub d'accueil `/simulateur`. 3 chemins exclusifs pour démarrer :
 *
 *   1. « J'ai un problème » → questionnaire de 5 cases qui recommande le mode adapté.
 *   2. « Simulation rapide » (5 min) → /diagnostic-express (BDNB CSTB, sans saisie).
 *   3. « Simulation complète » (25-30 min) → /simulateur/complet (wizard détaillé).
 *
 * Le mode complet sauvegarde localement la progression (anonyme) puis demande
 * une création de compte pour afficher l'étiquette DPE, les scénarios et les aides
 * (lead-magnet — cf décisions audit-ux-2026-05-12 #7).
 */
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Zap,
  Microscope,
  AlertCircle,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const PATHS: Array<{
  to: string
  badge: string
  Icon: typeof Zap
  iconBg: string
  iconColor: string
  border: string
  title: string
  duration: string
  description: string
  features: string[]
  cta: string
  recommended?: boolean
}> = [
  {
    to: '/simulateur/probleme',
    badge: 'Vous hésitez ?',
    Icon: AlertCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    border: 'border-amber-300 hover:border-amber-500',
    title: 'J\'ai un problème',
    duration: '< 1 minute',
    description: 'Quelques cases à cocher (froid, humidité, factures, vente…) et on vous recommande le mode adapté.',
    features: [
      'Aucune saisie technique',
      'Recommandation personnalisée',
      'Vous gardez le choix final',
    ],
    cta: 'Décrire ma situation',
  },
  {
    to: '/diagnostic-express',
    badge: 'Le plus rapide',
    Icon: Zap,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    border: 'border-emerald-300 hover:border-emerald-500',
    title: 'Simulation rapide',
    duration: '5 minutes',
    description: 'Tapez votre adresse, on récupère votre DPE existant et les aides applicables. Idéal pour un premier aperçu.',
    features: [
      'Adresse + 3 infos foyer',
      'DPE actuel + projeté',
      'Aides MaPrimeRénov\' éligibles',
    ],
    cta: 'Démarrer la simulation rapide',
    recommended: true,
  },
  {
    to: '/simulateur/complet',
    badge: 'Le plus précis',
    Icon: Microscope,
    iconBg: 'bg-slate-900',
    iconColor: 'text-white',
    border: 'border-slate-300 hover:border-slate-900',
    title: 'Simulation complète',
    duration: '25-30 minutes',
    description: 'Audit énergétique détaillé : géométrie, isolation, équipements, ventilation. Vous obtenez le même niveau de précision qu\'un audit pro.',
    features: [
      'Étiquette DPE 3CL officielle',
      '5 scénarios de travaux chiffrés',
      'Aides détaillées (MPR, CEE, ÉcoPTZ)',
    ],
    cta: 'Lancer l\'audit complet',
  },
]

export default function Simulateur() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <header className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-4">
            <Sparkles size={11} /> Simulateur énergie BRH
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Comment voulez-vous commencer&nbsp;?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Trois chemins pour estimer votre situation énergétique. Choisissez le niveau
            de détail qui vous convient — vous pouvez toujours basculer d'un mode à l'autre.
          </p>
        </header>

        {/* 3 cards exclusives */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PATHS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className={`group relative rounded-2xl border-2 ${p.border} bg-white p-6 transition-all hover:shadow-lg flex flex-col`}
            >
              {p.recommended && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles size={10} /> Recommandé pour la plupart
                </span>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${p.iconBg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <p.Icon size={22} className={p.iconColor} strokeWidth={2} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {p.badge}
                </span>
              </div>

              <h2 className="font-display text-xl font-bold text-slate-900 mb-1">
                {p.title}
              </h2>
              <p className="inline-flex items-center gap-1 text-xs text-slate-500 mb-3">
                <Clock size={11} /> {p.duration}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                {p.description}
              </p>

              <ul className="space-y-1.5 mb-5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-slate-700 inline-flex items-start gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <span className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-slate-800 text-white text-sm font-bold transition">
                {p.cta} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        {/* Garanties / rassurances */}
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
