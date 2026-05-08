/**
 * Phase A (refonte UX 2026-05-08) — Hub d'inscription unifié /inscription.
 *
 * Avant : /inscription = inscription particulier directe (perçu confus).
 * Maintenant : /inscription = sélecteur 3 cards qui dispatch vers le bon flow :
 *   - Particulier             → /inscription/particulier
 *   - Pro / Artisan BTP       → /inscription/pro
 *   - Agence immobilière      → /inscription/agence
 *
 * Le param ?ref / ?recruiter est propagé sur les liens pour préserver le tracking
 * parrainage (MLM funnel). Si l'user a déjà un compte, lien vers /connexion.
 */
import { Link, useSearchParams } from 'react-router-dom'
import {
  Home,
  Wrench,
  Building2,
  ArrowRight,
  Sparkles,
  HandCoins,
  Network,
} from 'lucide-react'

interface Card {
  to: string
  Icon: typeof Home
  label: string
  tagline: string
  bullets: string[]
  cta: string
  /** Accent color used on icon halo + CTA */
  accent: 'emerald' | 'amber' | 'blue'
}

const CARDS: Card[] = [
  {
    to: '/inscription/particulier',
    Icon: Home,
    label: 'Particulier',
    tagline: 'Propriétaire ou futur acquéreur',
    bullets: [
      'Audit énergétique gratuit',
      'Carnet de santé de votre maison',
      'Gagnez de l\'argent en parrainant des proches',
    ],
    cta: 'Créer mon espace personnel',
    accent: 'emerald',
  },
  {
    to: '/inscription/pro',
    Icon: Wrench,
    label: 'Pro / Artisan BTP',
    tagline: 'Entreprise du bâtiment, RGE ou non',
    bullets: [
      'Prospection DPE F/G porte-à-porte',
      'Chiffrage IA + simulateur travaux',
      'Réseau pro + commissions parrainage',
    ],
    cta: 'Inscrire mon entreprise',
    accent: 'amber',
  },
  {
    to: '/inscription/agence',
    Icon: Building2,
    label: 'Agence immobilière',
    tagline: 'Cabinet de transaction ou de gestion',
    bullets: [
      'Foncier cadastre + leads vendeurs',
      'Score Vente IA des biens',
      'Classement Bretagne + parrainage agences',
    ],
    cta: 'Inscrire mon agence',
    accent: 'blue',
  },
]

const ACCENT_STYLES: Record<Card['accent'], { halo: string; cta: string; ring: string }> = {
  emerald: {
    halo: 'bg-emerald-100 text-emerald-700',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'hover:border-emerald-300 hover:shadow-emerald-100',
  },
  amber: {
    halo: 'bg-amber-100 text-amber-700',
    cta: 'bg-amber-600 hover:bg-amber-700 text-white',
    ring: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  blue: {
    halo: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    ring: 'hover:border-blue-300 hover:shadow-blue-100',
  },
}

export default function RegisterHubPage() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') || searchParams.get('recruiter')
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''

  return (
    <div className="min-h-screen bg-canvas px-4 py-12 lg:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-4">
            <Sparkles size={12} />
            BRH Habitat
          </div>
          <h1 className="font-display text-3xl lg:text-4xl text-text font-bold tracking-tight">
            Choisissez votre espace
          </h1>
          <p className="font-body text-base text-text-muted mt-3 max-w-xl mx-auto">
            BRH Habitat fédère 3 communautés : particuliers, pros du bâtiment et agences
            immobilières. Sélectionnez votre profil pour créer le bon compte.
          </p>
          {ref && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">
              <HandCoins size={12} />
              Inscription via parrainage — bonus actifs
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((card) => {
            const acc = ACCENT_STYLES[card.accent]
            return (
              <Link
                key={card.to}
                to={card.to + refQuery}
                className={`group bg-surface rounded-2xl border border-border p-6 transition-all duration-200 shadow-sm hover:shadow-lg ${acc.ring} flex flex-col`}
              >
                <div className={`w-12 h-12 rounded-xl ${acc.halo} flex items-center justify-center mb-4`}>
                  <card.Icon size={22} strokeWidth={2} />
                </div>
                <h2 className="font-display text-lg font-bold text-text">{card.label}</h2>
                <p className="text-xs text-text-muted mt-0.5 mb-4">{card.tagline}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {card.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13px] text-text">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-subtle mt-1.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <span
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg ${acc.cta} text-sm font-bold transition-colors`}
                >
                  {card.cta}
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            )
          })}
        </div>

        {/* Reseau pro cross-persona */}
        <div className="mt-10 bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <Network size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-900">
              Une plateforme, trois communautés interconnectées
            </p>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Particuliers, pros et agences peuvent se trouver, échanger et collaborer via le
              réseau pro intégré. Chaque profil garde ses outils métier propres tout en accédant à
              l'écosystème BRH.
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-sm font-body text-text-muted">
          Vous avez déjà un compte ?{' '}
          <Link to="/connexion" className="text-emerald-700 hover:text-emerald-800 font-semibold underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
