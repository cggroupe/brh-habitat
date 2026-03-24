import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeEuro,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Euro,
  Home,
  Info,
  Leaf,
  Mail,
  Printer,
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
import { analyzeDiagnostic, estimateDpeGain } from '@/lib/diagnostic-engine'
import type { DiagnosticResult, TypeResult } from '@/lib/diagnostic-engine'
import { calculateAides } from '@/lib/aides-engine'
import { generateRenovationPlan } from '@/lib/renovation-plan-engine'
import { DpeScale } from '@/components/DpeScale'
import { AidesCard } from '@/components/AidesCard'
import { RenovationTimeline } from '@/components/RenovationTimeline'
import { ContactRdvModal } from '@/components/ContactRdvModal'
import { articles } from '@/data/articles'
import type { ArticleData } from '@/data/articles'
import type { DiagnosticType } from '@/stores/diagnosticStore'

// ---------------------------------------------------------------------------
// Icon resolver
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
// Helpers
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

const REVENUE_LABELS: Record<string, string> = {
  bleu: 'Profil Bleu — Revenus tres modestes',
  jaune: 'Profil Jaune — Revenus modestes',
  violet: 'Profil Violet — Revenus intermediaires',
  rose: 'Profil Rose — Revenus superieurs',
}

// Mapping type diagnostic -> categories articles
const TYPE_TO_ARTICLE_CATEGORY: Partial<Record<DiagnosticType, string>> = {
  humidite: 'humidite',
  isolation: 'isolation',
  ventilation: 'ventilation',
  menuiseries: 'menuiseries',
  electricite: 'electricite',
  toiture: 'toiture',
  // plomberie: pas de categorie dediee
}

function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatBudgetRange(min: number, max: number): string {
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
  return `${fmt(min)} — ${fmt(max)} EUR`
}

// ---------------------------------------------------------------------------
// Section wrapper — apparence magazine avec separation nette
// ---------------------------------------------------------------------------

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-fadeIn ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
      <div className="size-9 rounded-xl bg-[#1c7b1d]/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-display text-lg text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="font-body text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score circulaire SVG
// ---------------------------------------------------------------------------

function ScoreBadge({ score, urgency }: { score: number; urgency: UrgencyLevel }) {
  const config = URGENCY_CONFIG[urgency]
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const strokeColor =
    urgency === 'faible' ? '#16a34a'
    : urgency === 'modere' ? '#ca8a04'
    : urgency === 'eleve' ? '#ea580c'
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
          <span className="font-accent text-3xl text-slate-900">{score}</span>
          <span className="font-body text-xs text-slate-400">/100</span>
        </div>
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display ${config.color} ${config.bg} border ${config.border}`}
      >
        <config.icon size={14} />
        {config.label}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TypeResultCard enrichie (+ aide MPR si applicable)
// ---------------------------------------------------------------------------

function TypeResultCard({
  result,
  mprAmount,
}: {
  result: TypeResult
  mprAmount: number
}) {
  const typeConfig = diagnosticTypes.find((t) => t.id === result.type)
  const urgencyConfig = URGENCY_CONFIG[result.urgencyLevel as UrgencyLevel]
  if (!typeConfig || !urgencyConfig) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-fadeIn">
      {/* En-tete */}
      <div className={`flex items-center gap-3 px-5 py-4 ${typeConfig.bgColor}`}>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <DiagnosticIcon name={typeConfig.icon} size={20} className={typeConfig.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-slate-900">{typeConfig.label}</h3>
          <p className={`text-xs font-body ${urgencyConfig.color}`}>{urgencyConfig.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-accent text-2xl text-slate-900">{result.score}</span>
          <span className="font-body text-xs text-slate-400">/100</span>
        </div>
      </div>

      {/* Barre de score */}
      <div className="px-5 pt-4 pb-1">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyConfig.bar}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* Budget + aide MPR */}
      <div className="px-5 py-3 flex items-center justify-between gap-2 text-sm border-b border-slate-50">
        <div className="flex items-center gap-2 font-body text-slate-500">
          <Euro size={14} className="text-[#1c7b1d] shrink-0" />
          Budget :&nbsp;
          <span className="font-semibold text-slate-800">{formatBudgetRange(result.budgetMin, result.budgetMax)}</span>
        </div>
        {mprAmount > 0 && (
          <span className="shrink-0 text-xs font-bold text-[#1c7b1d] bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
            MPR -{formatEur(mprAmount)}
          </span>
        )}
      </div>

      {/* Recommandations */}
      {result.recommendations.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p className="font-display text-xs text-slate-400 uppercase tracking-wider">Recommandations</p>
          {result.recommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 text-xs font-display px-2 py-0.5 rounded-md ${PRIORITY_BADGE[rec.priority]}`}>
                {PRIORITY_LABEL[rec.priority]}
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm text-slate-900 leading-snug">{rec.title}</p>
                <p className="font-body text-xs text-slate-500 mt-0.5 leading-relaxed">{rec.description}</p>
                <p className="font-body text-xs text-[#1c7b1d] mt-1">{rec.estimatedBudget}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Article card
// ---------------------------------------------------------------------------

function ArticleCard({ article }: { article: ArticleData }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#1c7b1d]/30 transition-all p-4 flex flex-col gap-3 animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold bg-[#1c7b1d]/10 text-[#1c7b1d] rounded-full px-2.5 py-0.5 capitalize">
          {article.category}
        </span>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock size={12} />
          {article.readTime} min
        </div>
      </div>
      <h4 className="font-display text-sm text-slate-900 leading-snug group-hover:text-[#1c7b1d] transition-colors line-clamp-2">
        {article.title}
      </h4>
      <p className="font-body text-xs text-slate-500 leading-relaxed line-clamp-2">{article.excerpt}</p>
      <div className="flex items-center gap-1 text-xs font-semibold text-[#1c7b1d] mt-auto">
        Lire l'article
        <ChevronRight size={12} />
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function DiagnosticResultsPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const store = useDiagnosticStore()
  const [showContactModal, setShowContactModal] = useState(false)

  // Resultats : depuis la navigation ou recomputes
  const results: DiagnosticResult | null = useMemo(() => {
    if (location.state?.results) return location.state.results as DiagnosticResult
    if (store.selectedTypes.length > 0) {
      return analyzeDiagnostic(store.selectedTypes, store.symptoms, store.property.year, store.equipment)
    }
    return null
  }, [location.state, store.selectedTypes, store.symptoms, store.property.year, store.equipment])

  // Donnees derivees
  const aides = useMemo(() => {
    if (!results) return null
    return calculateAides(
      results,
      store.selectedTypes,
      store.situation.revenueProfile ?? null,
      store.property.surface,
    )
  }, [results, store.selectedTypes, store.situation.revenueProfile, store.property.surface])

  const renovationPlan = useMemo(() => {
    if (!results) return null
    return generateRenovationPlan(results)
  }, [results])

  const dpeEstimate = useMemo(() => {
    if (!results) return null
    return estimateDpeGain(store.selectedTypes, store.equipment.dpeRating, results)
  }, [results, store.selectedTypes, store.equipment.dpeRating])

  // Articles pertinents (max 3, filtres par types selectionnes)
  const relevantArticles = useMemo(() => {
    if (!store.selectedTypes.length) return []
    const categories = store.selectedTypes
      .map((t) => TYPE_TO_ARTICLE_CATEGORY[t])
      .filter(Boolean) as string[]
    const seen = new Set<string>()
    const result: ArticleData[] = []
    for (const cat of categories) {
      const found = articles.find((a) => a.category === cat && !seen.has(a.slug))
      if (found) {
        seen.add(found.slug)
        result.push(found)
      }
      if (result.length >= 3) break
    }
    return result
  }, [store.selectedTypes])

  // MPR par type (pour enrichir les TypeResultCards)
  const mprByType = useMemo(() => {
    if (!aides) return {} as Record<DiagnosticType, number>
    const map: Partial<Record<DiagnosticType, number>> = {}
    // On repartit mprTotal equitablement par type (heuristique simple)
    // Les details MPR sont par geste, pas par type — on fait une sommation approchee
    for (const type of store.selectedTypes) {
      map[type] = 0
    }
    return map as Record<DiagnosticType, number>
  }, [aides, store.selectedTypes])

  // Summary auto pour la modal
  const diagnosticSummary = useMemo(() => {
    if (!results) return ''
    return results.typeResults
      .map((tr) => {
        const typeConfig = diagnosticTypes.find((t) => t.id === tr.type)
        const label = typeConfig?.label ?? tr.type
        return `${label} ${tr.score}/100`
      })
      .join(', ')
  }, [results])

  const resteAChargeStr = useMemo(() => {
    if (!aides) return undefined
    const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
    return `${fmt(aides.resteAChargeMin)} — ${fmt(aides.resteAChargeMax)} EUR`
  }, [aides])

  // Etat vide
  if (!results) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info size={28} className="text-slate-400" />
          </div>
          <h1 className="font-display text-2xl text-slate-900 mb-2">Resultat introuvable</h1>
          <p className="font-body text-slate-500 mb-6">
            Le diagnostic #{id} n'est pas disponible. Lancez un nouveau diagnostic pour obtenir vos resultats.
          </p>
          <Link
            to="/diagnostic"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1c7b1d] text-white font-display rounded-xl hover:bg-[#1c7b1d]/90 transition-colors"
          >
            <RefreshCw size={16} />
            Nouveau diagnostic
          </Link>
        </div>
      </div>
    )
  }

  const overallConfig = URGENCY_CONFIG[results.urgencyLevel as UrgencyLevel]
  const totalAides = aides ? aides.mprTotal + aides.ceeTotal : 0
  const revenueLabel = store.situation.revenueProfile
    ? REVENUE_LABELS[store.situation.revenueProfile]
    : null

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ===== SECTION 1 — HERO SCORE ===== */}
      <div className={`${overallConfig.bg} border-b ${overallConfig.border}`}>
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <ScoreBadge score={results.overallScore} urgency={results.urgencyLevel as UrgencyLevel} />

            <div className="flex-1 text-center sm:text-left">
              <p className="font-body text-xs text-slate-400 uppercase tracking-widest mb-1">
                Votre diagnostic BRH Habitat
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-slate-900 mb-2 leading-tight">
                Rapport d'analyse personnalise
              </h1>

              {revenueLabel && (
                <span className="inline-block mb-3 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1">
                  {revenueLabel}
                </span>
              )}

              <p className={`font-body text-base ${overallConfig.color} mb-5`}>
                Niveau d'urgence global :&nbsp;<strong>{overallConfig.label}</strong>
              </p>

              {/* Budget + aides */}
              <div className={`inline-block rounded-2xl border ${overallConfig.border} bg-white/80 px-5 py-4 text-left`}>
                <div className="flex items-center gap-2 mb-2">
                  <Euro size={16} className="text-slate-400" />
                  <span className="font-body text-xs text-slate-400 uppercase tracking-wide">Budget brut estime</span>
                </div>
                <p className="font-display text-xl text-slate-900 mb-3">
                  {formatBudgetRange(results.totalBudgetMin, results.totalBudgetMax)}
                </p>
                {totalAides > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#1c7b1d] font-body mb-1">
                    <BadgeEuro size={14} />
                    Aides estimees :&nbsp;
                    <span className="font-bold">- {formatEur(totalAides)}</span>
                  </div>
                )}
                {aides && (
                  <div className="flex items-center gap-2 font-body">
                    <Leaf size={14} className="text-[#1c7b1d]" />
                    <span className="text-sm font-black text-slate-900">
                      Reste a charge :&nbsp;
                      {formatBudgetRange(aides.resteAChargeMin, aides.resteAChargeMax)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CORPS DE PAGE ===== */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* ===== SECTION 2 — DPE AVANT/APRES ===== */}
        {dpeEstimate && (dpeEstimate.currentClass || dpeEstimate.estimatedClassAfter) && (
          <SectionCard>
            <SectionHeader
              icon={<TrendingUp size={18} className="text-[#1c7b1d]" />}
              title="Votre performance energetique"
              subtitle="Estimation avant et apres travaux"
            />
            <div className="p-6">
              <DpeScale
                currentClass={dpeEstimate.currentClass}
                targetClass={dpeEstimate.estimatedClassAfter}
              />

              {dpeEstimate.gainClasses > 0 && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px] bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-[#1c7b1d] leading-none">
                      +{dpeEstimate.gainClasses}
                    </p>
                    <p className="text-xs font-body text-slate-500 mt-1">classes DPE gagnees</p>
                  </div>
                  {dpeEstimate.savingsPerYear > 0 && (
                    <div className="flex-1 min-w-[140px] bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-[#1c7b1d] leading-none">
                        ~{formatEur(dpeEstimate.savingsPerYear)}
                      </p>
                      <p className="text-xs font-body text-slate-500 mt-1">economies / an</p>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 font-body text-xs text-slate-400 leading-relaxed">
                Estimation indicative basee sur les travaux envisages. Seul un audit energetique reglementaire
                (RGE ou ADEME) peut determiner votre classe DPE reelle.
              </p>
            </div>
          </SectionCard>
        )}

        {/* ===== SECTION 3 — PLAN DE RENOVATION ===== */}
        {renovationPlan && renovationPlan.steps.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<Calendar size={18} className="text-[#1c7b1d]" />}
              title="Votre plan de renovation recommande"
              subtitle={`Duree estimee : ${renovationPlan.estimatedDuration}`}
            />
            <div className="p-6">
              <p className="font-body text-xs text-slate-400 leading-relaxed mb-6">
                Les travaux sont ordonnes selon les recommandations de l'ADEME pour maximiser l'efficacite
                energetique et eviter les erreurs courantes (ex : isoler avant de ventiler).
              </p>
              <RenovationTimeline
                steps={renovationPlan.steps}
                warnings={renovationPlan.warnings}
                totalBudgetMin={renovationPlan.totalBudgetMin}
                totalBudgetMax={renovationPlan.totalBudgetMax}
              />
            </div>
          </SectionCard>
        )}

        {/* ===== SECTION 4 — AIDES FINANCIERES ===== */}
        {aides && (
          <SectionCard>
            <SectionHeader
              icon={<BadgeEuro size={18} className="text-[#1c7b1d]" />}
              title="Vos aides financieres"
              subtitle={aides.estimated ? 'Estimation sur profil median — renseignez vos revenus pour personnaliser' : undefined}
            />
            <div className="p-6">
              <AidesCard
                budgetMin={results.totalBudgetMin}
                budgetMax={results.totalBudgetMax}
                mprAmount={aides.mprTotal}
                ceeAmount={aides.ceeTotal}
                resteAChargeMin={aides.resteAChargeMin}
                resteAChargeMax={aides.resteAChargeMax}
                revenueProfile={store.situation.revenueProfile ?? null}
                ecoPtr={aides.ecoPtr}
                tvaReduite={aides.tvaReduite}
              />

              {/* Detail MPR par geste */}
              {aides.mprDetails.length > 0 && (
                <div className="mt-5 border-t border-slate-50 pt-4">
                  <p className="font-display text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Detail MaPrimeRenov' 2026
                  </p>
                  <div className="space-y-2">
                    {aides.mprDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-body text-slate-600">{detail.label}</span>
                        <span className="font-bold text-[#1c7b1d] shrink-0">
                          - {formatEur(detail.montant)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail CEE */}
              {aides.ceeDetails.length > 0 && (
                <div className="mt-4 border-t border-slate-50 pt-4">
                  <p className="font-display text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Detail Certificats CEE
                  </p>
                  <div className="space-y-2">
                    {aides.ceeDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-body text-slate-600">{detail.label}</span>
                        <span className="font-bold text-[#359932] shrink-0">
                          - {formatEur(detail.montant)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ===== SECTION 5 — ANALYSE PAR DOMAINE ===== */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="size-9 rounded-xl bg-[#1c7b1d]/10 flex items-center justify-center shrink-0">
              <Info size={18} className="text-[#1c7b1d]" />
            </div>
            <div>
              <h2 className="font-display text-lg text-slate-900">Analyse par domaine</h2>
              <p className="font-body text-xs text-slate-400">
                {results.typeResults.length} domaine{results.typeResults.length > 1 ? 's' : ''} evalue{results.typeResults.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.typeResults.map((tr) => (
              <TypeResultCard
                key={tr.type}
                result={tr}
                mprAmount={mprByType[tr.type] ?? 0}
              />
            ))}
          </div>
        </div>

        {/* ===== SECTION 6 — ARTICLES RECOMMANDES ===== */}
        {relevantArticles.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<BookOpen size={18} className="text-[#1c7b1d]" />}
              title="Articles lies a votre diagnostic"
              subtitle="Guides pratiques selectionnes selon vos problematiques"
            />
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relevantArticles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1c7b1d] hover:underline font-body"
                >
                  Voir tous nos guides
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ===== SECTION 7 — CTA FINALE ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1c7b1d] via-[#359932] to-[#4caf50] p-8 text-white text-center shadow-xl shadow-green-900/20 animate-fadeIn">
          <p className="font-body text-green-200 text-xs uppercase tracking-widest mb-2">Prochaines etapes</p>
          <h2 className="font-display text-2xl sm:text-3xl mb-3 leading-tight">
            Un expert vous accompagne
          </h2>
          <p className="font-body text-green-100 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Nos artisans certifies RGE en Bretagne analysent votre rapport et vous proposent
            un devis personnalise, aides incluses.
          </p>

          {/* Etapes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-lg mx-auto text-left">
            {[
              { icon: CheckCircle2, step: '1.', label: 'Validation expert', detail: 'Sous 24h' },
              { icon: Calendar, step: '2.', label: 'Visite sur site', detail: 'Gratuite' },
              { icon: ArrowRight, step: '3.', label: 'Devis personnalise', detail: 'Aides incluses' },
            ].map(({ icon: Icon, step, label, detail }) => (
              <div key={step} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Icon size={18} className="text-green-200 shrink-0" />
                <div>
                  <p className="font-display text-sm leading-tight">{step} {label}</p>
                  <p className="font-body text-xs text-green-300">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-[#1c7b1d] font-display text-sm rounded-xl hover:bg-green-50 transition-colors shadow-sm"
            >
              <Calendar size={16} />
              Prendre rendez-vous
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-white text-white font-display text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              <Printer size={16} />
              Telecharger en PDF
            </button>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-white/60 text-white/90 font-display text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              <Mail size={16} />
              Etre recontacte par email
            </button>
            <Link
              to="/diagnostic"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-white/40 text-white/70 font-display text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={16} />
              Refaire un diagnostic
            </Link>
          </div>

          <p className="mt-6 font-body text-xs text-green-200/70">
            Diagnostic gratuit et sans engagement — Artisans certifies RGE Bretagne
          </p>
        </div>

      </div>

      {/* Modal contact / RDV */}
      {showContactModal && (
        <ContactRdvModal
          onClose={() => setShowContactModal(false)}
          diagnosticId={id}
          diagnosticSummary={diagnosticSummary}
          propertyAddress={store.property.address}
          resteACharge={resteAChargeStr}
        />
      )}
    </div>
  )
}
