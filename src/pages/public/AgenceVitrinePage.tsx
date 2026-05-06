/**
 * Phase 16.1 — Vitrine publique d'une agence partenaire BRH.
 *
 * URL `/a/:agenceId` (public, sans guard). Cible : prospects scannant un
 * QR code agence depuis une carte de visite, vitrine, ou panneau.
 *
 * Données via RPC SECURITY DEFINER `brh_get_public_agence` (filtre status=
 * partenaire + charte active). Aucune fuite de SIRET / contacts internes.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Building2,
  Mail,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Flame,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PublicAgenceRow {
  id: string
  raison_sociale: string
  commune: string | null
  departement: string | null
  code_postal: string | null
  site_web: string | null
  status: string
}

export default function AgenceVitrinePage() {
  const { agenceId } = useParams<{ agenceId: string }>()
  const [agence, setAgence] = useState<PublicAgenceRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!agenceId) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase.rpc('brh_get_public_agence', {
        p_agence_id: agenceId,
      })
      if (cancelled) return
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true)
      } else {
        setAgence(Array.isArray(data) ? (data[0] as PublicAgenceRow) : (data as PublicAgenceRow))
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [agenceId])

  const contactUrl = useMemo(() => {
    if (!agenceId) return '/contact'
    return `/contact?agence=${encodeURIComponent(agenceId)}`
  }, [agenceId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !agence) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Building2 size={48} className="text-text-light mb-3" />
        <h1 className="text-xl font-bold text-text-secondary">Agence introuvable</h1>
        <p className="text-sm text-text-light mt-1 max-w-md">
          Cette agence n'est plus partenaire ou le lien est incorrect. Vous pouvez tout de même
          demander une simulation gratuite directement à BRH.
        </p>
        <Link
          to="/contact"
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          <Mail size={14} />
          Demander une simulation
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-white to-background">
      {/* Hero */}
      <header className="bg-gradient-to-br from-deep via-primary-dark to-deep text-white">
        <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame size={16} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-primary-light font-bold">
              Partenaire BRH Habitat
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-3 leading-[1.05]">
            {agence.raison_sociale}
          </h1>
          <p className="text-text-light text-sm lg:text-base">
            {agence.commune
              ? `${agence.code_postal ? agence.code_postal + ' ' : ''}${agence.commune}`
              : null}
            {agence.departement ? ` · Département ${agence.departement}` : null}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-success/10 border border-success/30 rounded-full px-4 py-1.5 text-xs font-bold text-primary-light">
            <ShieldCheck size={13} />
            Agence partenaire certifiée
          </div>
        </div>
      </header>

      {/* CTA */}
      <main className="max-w-3xl mx-auto px-6 py-10 lg:py-14 space-y-8">
        <section className="bg-white rounded-3xl shadow-xl shadow-text-primary/5 border border-neutral-light p-7 lg:p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-dark/10 mb-4">
            <Sparkles size={26} className="text-primary" />
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mb-3">
            Vous voulez vendre ou rénover votre maison&nbsp;?
          </h2>
          <p className="text-text-secondary text-sm lg:text-base max-w-lg mx-auto mb-6">
            En partenariat avec <strong>{agence.raison_sociale}</strong>, BRH Habitat vous propose
            une simulation énergétique gratuite, un chiffrage des travaux et une estimation
            d'aides MaPrimeRénov' — en moins de 5 minutes.
          </p>
          <Link
            to={contactUrl}
            className="inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <Mail size={14} />
            Demander ma simulation gratuite
          </Link>
          <p className="text-[11px] text-text-light mt-3">
            Sans engagement · Réponse sous 48 h ouvrées
          </p>
        </section>

        {/* Avantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: CheckCircle2,
              title: 'Diagnostic énergétique',
              desc: 'Estimation DPE 3CL + scénarios de travaux personnalisés.',
            },
            {
              icon: CheckCircle2,
              title: 'Chiffrage chantier',
              desc: 'Devis indicatifs Batichiffrage + retour sur investissement.',
            },
            {
              icon: CheckCircle2,
              title: 'Aides 2026',
              desc: 'MaPrimeRénov\', CEE, aides locales Bretagne — calculées auto.',
            },
          ].map((a) => (
            <div key={a.title} className="bg-white rounded-2xl border border-neutral-light p-4">
              <a.icon size={16} className="text-success mb-2" />
              <p className="font-bold text-text-primary text-sm">{a.title}</p>
              <p className="text-xs text-text-light mt-1">{a.desc}</p>
            </div>
          ))}
        </section>

        {/* Site agence */}
        {agence.site_web ? (
          <section className="bg-background rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-light uppercase tracking-wider">
                Site de l'agence
              </p>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {agence.site_web}
              </p>
            </div>
            <a
              href={agence.site_web}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-light text-text-secondary text-xs font-bold rounded-lg hover:bg-background transition"
            >
              Visiter
              <ExternalLink size={12} />
            </a>
          </section>
        ) : null}

        <p className="text-center text-[11px] text-text-light">
          BRH Habitat — Bretagne Rénovation Habitat · Partenaire reconnu Hoguet « A »
        </p>
      </main>
    </div>
  )
}
