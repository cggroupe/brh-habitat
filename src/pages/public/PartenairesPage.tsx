import { Link } from 'react-router-dom'
import { Building2, Heart, TrendingUp, Gift, Users, Euro, ArrowRight } from 'lucide-react'
import { SEOHead } from '@/components/shared/SEOHead'
import { usePublicPartenaires } from '@/hooks/queries/partenaires-public'
import PartnerCard from '@/components/public/PartnerCard'

export default function PartenairesPage() {
  const { data: partners = [], isLoading: partnersLoading } = usePublicPartenaires({ limit: 60 })
  const hasPartners = partners.length > 0

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Partenaires BRH Habitat — Architectes, agents immo, maîtres d'œuvre Bretagne"
        description={`Annuaire des ${partners.length || ''} partenaires BRH actifs en Bretagne. Architectes, agents immobiliers, maîtres d'œuvre et courtiers certifiés rénovation énergétique. Devenez partenaire et apparaissez ici.`}
      />
      {/* Hero */}
      <section className="bg-primary-dark py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl text-white uppercase tracking-wide mb-4">
            Devenez partenaire BRH
          </h1>
          <p className="font-body text-lg text-green-200 max-w-2xl mx-auto mb-10">
            Rejoignez le reseau breton de la renovation. Envoyez-nous vos clients ou parrainez vos proches, et soyez recompenses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/inscription/pro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-display text-base font-bold rounded-xl hover:bg-green-50 transition-colors uppercase tracking-wide shadow-lg"
            >
              <Building2 size={20} />
              Partenaire professionnel
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/inscription/particulier"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary/90 transition-colors uppercase tracking-wide shadow-lg border border-white/20"
            >
              <Heart size={20} />
              Particulier affilie
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Annuaire public — proposition de valeur SEO pour les pros partenaires */}
      <section className="py-14 px-4 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
              Notre réseau
            </p>
            <h2 className="font-display text-3xl text-slate-900 mb-3 font-bold tracking-tight">
              {hasPartners
                ? `${partners.length} ${partners.length > 1 ? 'professionnels partenaires' : 'professionnel partenaire'} en Bretagne`
                : 'Le réseau de professionnels BRH'}
            </h2>
            <p className="font-body text-slate-600 max-w-2xl mx-auto">
              Architectes, agents immobiliers, maîtres d'œuvre et courtiers en travaux qui ont
              rejoint BRH Habitat et accepté d'apparaître dans cet annuaire.
            </p>
          </div>

          {partnersLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
            </div>
          )}

          {!partnersLoading && !hasPartners && (
            <div className="text-center py-12 rounded-xl border border-slate-200 bg-slate-50 max-w-2xl mx-auto">
              <Building2 size={36} className="mx-auto text-slate-400 mb-3" />
              <p className="font-display text-lg text-slate-800 font-bold">
                Le réseau démarre
              </p>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                L'annuaire affichera ici les professionnels partenaires qui ont rejoint BRH Habitat
                et activé leur visibilité publique. Soyez parmi les premiers et bénéficiez d'une
                visibilité SEO sur la Bretagne.
              </p>
              <Link
                to="/inscription/pro"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-white font-bold rounded-md text-sm transition-colors hover:opacity-90"
                style={{ backgroundColor: '#003404' }}
              >
                Devenir partenaire <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {!partnersLoading && hasPartners && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map((p) => (
                  <PartnerCard key={p.id} partner={p} />
                ))}
              </div>
              <div className="mt-10 text-center">
                <p className="text-sm text-slate-500 mb-3">
                  Vous êtes architecte, agent immo, maître d'œuvre ou courtier en travaux ?
                </p>
                <Link
                  to="/inscription/pro"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-md text-sm transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#003404' }}
                >
                  Rejoindre le réseau <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section Pro */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Building2 size={28} className="text-primary" />
            </div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-slate-900 mb-3">
              Partenaires professionnels
            </h2>
            <p className="font-body text-slate-500 max-w-xl mx-auto">
              Architectes, agents immobiliers, maitres d'oeuvre, courtiers en travaux — envoyez-nous vos clients et percevez des commissions sur le CA signe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-background rounded-xl p-6 text-center">
              <TrendingUp size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Commissions</h3>
              <p className="font-body text-sm text-slate-500">Percevez un pourcentage sur chaque devis signe grace a vos recommandations.</p>
            </div>
            <div className="bg-background rounded-xl p-6 text-center">
              <Users size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Pipeline</h3>
              <p className="font-body text-sm text-slate-500">Suivez vos prospects en temps reel : statut, devis, signatures.</p>
            </div>
            <div className="bg-background rounded-xl p-6 text-center">
              <Euro size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Niveaux</h3>
              <p className="font-body text-sm text-slate-500">Bronze, Silver, Gold, Platinum — plus vous apportez, plus vous gagnez.</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/inscription/pro"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
            >
              Creer mon compte partenaire <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Section Particulier */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Heart size={28} className="text-primary" />
            </div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-slate-900 mb-3">
              Particuliers affilies
            </h2>
            <p className="font-body text-slate-500 max-w-xl mx-auto">
              Vous etes client BRH ? Parrainez vos proches et gagnez des points echangeables contre des cadeaux et des reductions sur vos futurs travaux.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100">
              <Users size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Parrainage simple</h3>
              <p className="font-body text-sm text-slate-500">Envoyez le nom de votre proche, on s'occupe du reste.</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100">
              <Gift size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Catalogue cadeaux</h3>
              <p className="font-body text-sm text-slate-500">Echangez vos points contre des cadeaux, bons d'achat ou reductions travaux.</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100">
              <TrendingUp size={28} className="text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-800 mb-2">Suivi en direct</h3>
              <p className="font-body text-sm text-slate-500">Suivez le statut de vos parrainages et vos points en temps reel.</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/inscription/particulier"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
            >
              Devenir affilie <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA connexion */}
      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-body text-slate-500 mb-4">Deja partenaire ou affilie ?</p>
          <Link
            to="/connexion"
            className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary font-display text-sm rounded-lg hover:bg-primary/5 transition-colors uppercase tracking-wide"
          >
            Se connecter a mon espace
          </Link>
        </div>
      </section>
    </div>
  )
}
