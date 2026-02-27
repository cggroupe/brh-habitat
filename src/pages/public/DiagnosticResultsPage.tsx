import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Droplets,
  Euro,
  Home,
  Info,
  RefreshCw,
  Square,
  Thermometer,
  TrendingUp,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react'

import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { diagnosticTypes } from '@/data/diagnostic-types'
import { analyzeDiagnostic } from '@/lib/diagnostic-engine'
import type { DiagnosticResult, TypeResult } from '@/lib/diagnostic-engine'

// ---------------------------------------------------------------------------
// Icon resolver (same as wizard)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Droplets,
  Thermometer,
  Wind,
  Square,
  Zap,
  Home,
  Wrench,
}

function DiagnosticIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Home
  return <Icon size={size} className={className} />
}

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------

type UrgencyLevel = 'faible' | 'modere' | 'eleve' | 'critique'

interface UrgencyConfig {
  label: string
  color: string
  bg: string
  border: string
  bar: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  faible: {
    label: 'Etat satisfaisant',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    bar: 'bg-green-500',
    icon: CheckCircle2,
  },
  modere: {
    label: 'Attention recommandee',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    bar: 'bg-yellow-500',
    icon: Info,
  },
  eleve: {
    label: 'Intervention conseillee',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    icon: TrendingUp,
  },
  critique: {
    label: 'Intervention urgente',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-500',
    icon: AlertTriangle,
  },
}

const PRIORITY_BADGE: Record<string, string> = {
  haute: 'bg-red-100 text-red-700 border border-red-200',
  moyenne: 'bg-orange-100 text-orange-700 border border-orange-200',
  basse: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const PRIORITY_LABEL: Record<string, string> = {
  haute: 'Priorite haute',
  moyenne: 'Priorite moyenne',
  basse: 'Priorite basse',
}

function formatBudget(min: number, max: number): string {
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
  return `${fmt(min)} — ${fmt(max)} EUR`
}

// ---------------------------------------------------------------------------
// Score badge (circular)
// ---------------------------------------------------------------------------

function ScoreBadge({ score, urgency }: { score: number; urgency: UrgencyLevel }) {
  const config = URGENCY_CONFIG[urgency]
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const strokeColor =
    urgency === 'faible'
      ? '#16a34a'
      : urgency === 'modere'
        ? '#ca8a04'
        : urgency === 'eleve'
          ? '#ea580c'
          : '#dc2626'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-accent text-3xl text-text-primary">{score}</span>
          <span className="font-body text-xs text-text-light">/100</span>
        </div>
      </div>
      <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display ${config.color} ${config.bg} border ${config.border}`}>
        <config.icon size={14} />
        {config.label}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type result card
// ---------------------------------------------------------------------------

function TypeResultCard({ result }: { result: TypeResult }) {
  const typeConfig = diagnosticTypes.find((t) => t.id === result.type)
  const urgencyConfig = URGENCY_CONFIG[result.urgencyLevel as UrgencyLevel]

  if (!typeConfig || !urgencyConfig) return null

  return (
    <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden shadow-sm">
      {/* Card header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${typeConfig.bgColor}`}>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <DiagnosticIcon name={typeConfig.icon} size={20} className={typeConfig.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-text-primary">{typeConfig.label}</h3>
          <p className={`text-xs font-body ${urgencyConfig.color}`}>{urgencyConfig.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-accent text-2xl text-text-primary">{result.score}</span>
          <span className="font-body text-xs text-text-light">/100</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-5 pt-4 pb-1">
        <div className="h-2 bg-gray-light rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyConfig.bar}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* Budget */}
      <div className="px-5 py-3 flex items-center gap-2 text-sm font-body text-text-secondary border-b border-gray-light">
        <Euro size={14} className="text-primary shrink-0" />
        Budget estime :&nbsp;
        <span className="font-semibold text-text-primary">{formatBudget(result.budgetMin, result.budgetMax)}</span>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p className="font-display text-xs text-text-light uppercase tracking-wider">Recommandations</p>
          {result.recommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span
                className={`shrink-0 mt-0.5 text-xs font-display px-2 py-0.5 rounded-md ${PRIORITY_BADGE[rec.priority]}`}
              >
                {PRIORITY_LABEL[rec.priority]}
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm text-text-primary leading-snug">{rec.title}</p>
                <p className="font-body text-xs text-text-light mt-0.5 leading-relaxed">{rec.description}</p>
                <p className="font-body text-xs text-primary mt-1">{rec.estimatedBudget}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DiagnosticResultsPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const store = useDiagnosticStore()

  // Results can come from navigation state (just submitted) or be recomputed from store
  const results: DiagnosticResult | null = useMemo(() => {
    if (location.state?.results) return location.state.results as DiagnosticResult

    // Fallback: recompute from store if still populated
    if (store.selectedTypes.length > 0) {
      return analyzeDiagnostic(store.selectedTypes, store.symptoms, store.property.year)
    }

    return null
  }, [location.state, store.selectedTypes, store.symptoms, store.property.year])

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info size={28} className="text-text-light" />
          </div>
          <h1 className="font-display text-2xl text-text-primary mb-2">
            Resultat introuvable
          </h1>
          <p className="font-body text-text-secondary mb-6">
            Le diagnostic #{id} n'est pas disponible. Lancez un nouveau diagnostic pour obtenir vos resultats.
          </p>
          <Link
            to="/diagnostic"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display rounded-xl hover:bg-primary-dark transition-colors"
          >
            <RefreshCw size={16} />
            Nouveau diagnostic
          </Link>
        </div>
      </div>
    )
  }

  const overallConfig = URGENCY_CONFIG[results.urgencyLevel as UrgencyLevel]

  return (
    <div className="min-h-screen bg-background">
      {/* Header / Hero */}
      <div className={`${overallConfig.bg} border-b ${overallConfig.border}`}>
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <ScoreBadge score={results.overallScore} urgency={results.urgencyLevel as UrgencyLevel} />

            <div className="flex-1 text-center sm:text-left">
              <p className="font-body text-sm text-text-light mb-1 uppercase tracking-wider">
                Votre diagnostic BRH Habitat
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-text-primary mb-3">
                Rapport d'analyse personnalise
              </h1>
              <p className={`font-body text-base ${overallConfig.color} mb-4`}>
                Niveau d'urgence global : <strong>{overallConfig.label}</strong>
              </p>

              {/* Budget total */}
              <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border ${overallConfig.border} bg-white/70`}>
                <Euro size={20} className="text-primary" />
                <div>
                  <p className="font-body text-xs text-text-light">Budget total estime</p>
                  <p className="font-display text-lg text-text-primary">
                    {formatBudget(results.totalBudgetMin, results.totalBudgetMax)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Type results */}
        <h2 className="font-display text-xl text-text-primary mb-6">
          Analyse par domaine
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {results.typeResults.map((tr) => (
            <TypeResultCard key={tr.type} result={tr} />
          ))}
        </div>

        {/* Top recommendations banner */}
        {results.recommendations.length > 0 && (
          <div className="bg-surface rounded-2xl border border-gray-light p-6 mb-10 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={20} className="text-primary" />
              <h2 className="font-display text-xl text-text-primary">
                Priorites d'intervention
              </h2>
            </div>
            <div className="space-y-4">
              {results.recommendations
                .filter((r) => r.priority === 'haute')
                .slice(0, 5)
                .map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-light last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="font-display text-sm text-text-primary mb-0.5">{rec.title}</p>
                      <p className="font-body text-xs text-text-secondary leading-relaxed">{rec.description}</p>
                      <p className="font-body text-xs text-primary mt-1">{rec.estimatedBudget}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CTA section */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-primary-light p-8 text-white text-center">
          <h2 className="font-display text-2xl sm:text-3xl mb-2">
            Prochaine etape
          </h2>
          <p className="font-body text-green-100 mb-8 max-w-md mx-auto">
            Nos experts BRH Habitat vous accompagnent de l'analyse a la realisation des travaux.
            Prenez rendez-vous pour une visite gratuite sur site.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-dark font-display text-base rounded-xl hover:bg-green-50 transition-colors"
            >
              <Calendar size={18} />
              Prendre rendez-vous
            </Link>
            <Link
              to="/diagnostic"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-display text-base rounded-xl hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={18} />
              Refaire un diagnostic
            </Link>
          </div>
          <p className="mt-6 font-body text-xs text-green-200">
            Diagnostic gratuit et sans engagement — Experts certifies RGE
          </p>
        </div>

        {/* Next steps info */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: CheckCircle2,
              title: '1. Validation',
              description: 'Nos experts etudient votre rapport et vous contactent sous 24h.',
            },
            {
              icon: Calendar,
              title: '2. Visite sur site',
              description: 'Un technicien se deplace pour confirmer le diagnostic.',
            },
            {
              icon: ArrowRight,
              title: '3. Devis personnalise',
              description: 'Vous recevez un devis detaille avec les aides disponibles.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-surface rounded-xl border border-gray-light p-5 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-display text-sm text-text-primary mb-1">{title}</h3>
              <p className="font-body text-xs text-text-light leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
