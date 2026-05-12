import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Info, RefreshCw, TrendingUp, Calendar, BookOpen, ChevronRight, Clock, ArrowRight } from 'lucide-react'

import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { diagnosticTypes } from '@/data/diagnostic-types'
import { analyzeDiagnostic, estimateDpeGain } from '@/lib/diagnostic-engine'
import type { DiagnosticResult } from '@/lib/diagnostic-engine'
import { calculateAides } from '@/lib/aides-engine'
import { generateRenovationPlan } from '@/lib/renovation-plan-engine'
import { DpeScale } from '@/components/DpeScale'
import { RenovationTimeline } from '@/components/RenovationTimeline'
import { ContactRdvModal } from '@/components/ContactRdvModal'
import { articles } from '@/data/articles'
import type { ArticleData } from '@/data/articles'
import type { DiagnosticType } from '@/stores/diagnosticStore'

import { DiagnosticHero } from './diagnostic-results/DiagnosticHero'
import { TypeResultCard } from './diagnostic-results/TypeResultCard'
import { DiagnosticAidesSection } from './diagnostic-results/DiagnosticAidesSection'
import { DiagnosticCtaSection } from './diagnostic-results/DiagnosticCtaSection'
import { SectionCard, SectionHeader } from './diagnostic-results/SectionCard'

// Mapping type diagnostic -> categories articles
const TYPE_TO_ARTICLE_CATEGORY: Partial<Record<DiagnosticType, string>> = {
  humidite: 'humidite',
  isolation: 'isolation',
  ventilation: 'ventilation',
  menuiseries: 'menuiseries',
  electricite: 'electricite',
  toiture: 'toiture',
}

function ArticleCard({ article }: { article: ArticleData }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-4 flex flex-col gap-3 animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-0.5 capitalize">
          {article.category}
        </span>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock size={12} />
          {article.readTime} min
        </div>
      </div>
      <h4 className="font-display text-sm text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {article.title}
      </h4>
      <p className="font-body text-xs text-slate-500 leading-relaxed line-clamp-2">{article.excerpt}</p>
      <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-auto">
        Lire l'article
        <ChevronRight size={12} />
      </div>
    </Link>
  )
}

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

  const aides = useMemo(() => {
    if (!results) return null
    return calculateAides(results, store.selectedTypes, store.situation.revenueProfile ?? null, store.property.surface)
  }, [results, store.selectedTypes, store.situation.revenueProfile, store.property.surface])

  const renovationPlan = useMemo(() => {
    if (!results) return null
    return generateRenovationPlan(results)
  }, [results])

  const dpeEstimate = useMemo(() => {
    if (!results) return null
    return estimateDpeGain(store.selectedTypes, store.equipment.dpeRating, results)
  }, [results, store.selectedTypes, store.equipment.dpeRating])

  const relevantArticles = useMemo(() => {
    if (!store.selectedTypes.length) return []
    const categories = store.selectedTypes.map((t) => TYPE_TO_ARTICLE_CATEGORY[t]).filter(Boolean) as string[]
    const seen = new Set<string>()
    const result: ArticleData[] = []
    for (const cat of categories) {
      const found = articles.find((a) => a.category === cat && !seen.has(a.slug))
      if (found) { seen.add(found.slug); result.push(found) }
      if (result.length >= 3) break
    }
    return result
  }, [store.selectedTypes])

  const mprByType = useMemo(() => {
    const map: Partial<Record<DiagnosticType, number>> = {}
    for (const type of store.selectedTypes) map[type] = 0
    return map as Record<DiagnosticType, number>
  }, [store.selectedTypes])

  const diagnosticSummary = useMemo(() => {
    if (!results) return ''
    return results.typeResults
      .map((tr) => {
        const typeConfig = diagnosticTypes.find((t) => t.id === tr.type)
        return `${typeConfig?.label ?? tr.type} ${tr.score}/100`
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display rounded-xl hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={16} />
            Nouveau diagnostic
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Section 1 — Hero Score */}
      <DiagnosticHero
        results={results}
        aides={aides}
        revenueProfile={store.situation.revenueProfile}
      />

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Section 2 — DPE avant/après */}
        {dpeEstimate && (dpeEstimate.currentClass || dpeEstimate.estimatedClassAfter) && (
          <SectionCard>
            <SectionHeader
              icon={<TrendingUp size={18} className="text-primary" />}
              title="Votre performance energetique"
              subtitle="Estimation avant et apres travaux"
            />
            <div className="p-6">
              <DpeScale currentClass={dpeEstimate.currentClass} targetClass={dpeEstimate.estimatedClassAfter} />
              {dpeEstimate.gainClasses > 0 && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px] bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-primary leading-none">+{dpeEstimate.gainClasses}</p>
                    <p className="text-xs font-body text-slate-500 mt-1">classes DPE gagnees</p>
                  </div>
                  {dpeEstimate.savingsPerYear > 0 && (
                    <div className="flex-1 min-w-[140px] bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-primary leading-none">
                        ~{dpeEstimate.savingsPerYear.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
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

        {/* Section 3 — Plan de renovation */}
        {renovationPlan && renovationPlan.steps.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<Calendar size={18} className="text-primary" />}
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

        {/* Section 4 — Aides financieres */}
        {aides && (
          <DiagnosticAidesSection
            results={results}
            aides={aides}
            revenueProfile={store.situation.revenueProfile}
          />
        )}

        {/* Section 5 — Analyse par domaine */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Info size={18} className="text-primary" />
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
              <TypeResultCard key={tr.type} result={tr} mprAmount={mprByType[tr.type] ?? 0} />
            ))}
          </div>
        </div>

        {/* Section 6 — Articles recommandes */}
        {relevantArticles.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<BookOpen size={18} className="text-primary" />}
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
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline font-body"
                >
                  Voir tous nos guides
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 7 — CTA finale */}
        <DiagnosticCtaSection onShowContact={() => setShowContactModal(true)} />

        {/* Upsell audit complet 25-30 min — charte BRH (vert primary) */}
        <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-green-50 to-emerald-50 p-5 lg:p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                Vous voulez aller plus loin&nbsp;?
              </p>
              <p className="font-display font-bold text-slate-900 text-lg leading-tight">
                Audit énergétique approfondi (25-30 min)
              </p>
              <p className="text-sm text-slate-700 mt-1">
                Saisie détaillée façade par façade, fenêtre par fenêtre, équipements précis.
                Vous obtenez votre <strong className="text-primary">étiquette DPE 3CL officielle</strong> et un chiffrage
                travaux&nbsp;+ aides personnalisé. Vos réponses sont sauvegardées localement à chaque étape.
              </p>
            </div>
            <Link
              to="/audit-complet"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition shrink-0 shadow-sm"
            >
              Lancer l'audit complet
              <ArrowRight size={14} />
            </Link>
          </div>
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
          referralCode={store.referralCode}
        />
      )}
    </div>
  )
}
