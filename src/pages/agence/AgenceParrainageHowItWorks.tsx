/**
 * Phase 16.1 — /agence/parrainage/comment-ca-marche
 *
 * Page de transparence : barème complet, FAQ, flow visuel. Aide les agences
 * partenaires à comprendre le mécanisme cascade 5 niveaux + leads bonus.
 *
 * Aucune donnée user, juste pédagogique. Accessible via lien depuis la page
 * principale `/agence/parrainage`.
 */
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Network,
  Euro,
  Sparkles,
  CheckCircle2,
  Shield,
  Calendar,
  HelpCircle,
} from 'lucide-react'

const LEVELS = [
  { lvl: 1, label: 'Parrain direct', cash: 100, leads: 5, color: 'from-primary to-primary-dark' },
  { lvl: 2, label: 'Grand-parrain', cash: 25, leads: 3, color: 'from-amber-500 to-orange-500' },
  { lvl: 3, label: 'Arrière-grand-parrain', cash: 10, leads: 2, color: 'from-yellow-500 to-amber-500' },
  { lvl: 4, label: 'Niveau 4', cash: 5, leads: 1, color: 'from-lime-500 to-yellow-500' },
  { lvl: 5, label: 'Niveau 5', cash: 5, leads: 1, color: 'from-emerald-500 to-lime-500' },
]

const FAQ = [
  {
    q: 'Quand est-ce que je reçois ma commission ?',
    a: 'La commission est créée automatiquement dès qu\'une agence parrainée signe sa charte et confirme son email (status « active » dans notre système). Le versement cash est effectué le 15 du mois suivant la validation. Les leads bonus sont crédités immédiatement.',
  },
  {
    q: 'Et si l\'agence parrainée annule sa charte ?',
    a: 'Si une charte est résiliée dans les 30 jours suivant signature, la commission correspondante passe au statut « annulée » et n\'est pas versée. C\'est notre garantie anti-fraude. Au-delà de 30 jours, la commission reste due même si l\'agence quitte ensuite.',
  },
  {
    q: 'Pourquoi mes leads bonus disparaissent-ils en début de mois ?',
    a: 'Tous les compteurs leads (forfait + bonus) sont remis à zéro le 1er de chaque mois. C\'est volontaire pour garder un flux dynamique. Consommez vos bonus avant la fin du mois pour ne pas les perdre.',
  },
  {
    q: 'Y a-t-il un plafond sur les leads bonus parrainage ?',
    a: 'Oui, 30 leads bonus parrainage par mois maximum par agence parrain. Au-delà, la commission cash continue d\'être versée mais les leads supplémentaires ne sont pas crédités. Cap mis en place pour garder l\'inventaire équilibré.',
  },
  {
    q: 'Pourquoi 5 niveaux et pas plus ?',
    a: 'Cap volontaire pour rester un programme de recommandation simple, pas un système pyramidal. Au-delà de 5 niveaux, la cascade s\'arrête : les arrière-arrière-arrière-arrière-grands-parrains ne touchent rien.',
  },
  {
    q: 'Est-ce que je peux m\'auto-parrainer ou parrainer mes propres employés ?',
    a: 'Non. Le système détecte automatiquement les cycles (A parraine B qui parraine A) et bloque la commission. Les employés invités via /agence/equipe ne sont pas des agences parrainées — ils font partie de la même agence.',
  },
  {
    q: 'Comment partager mon lien de parrainage ?',
    a: 'Sur la page "Mon réseau d\'agences", vous trouvez votre lien personnalisé `/inscription/agence?ref=<votre-id>` + 3 boutons rapides (WhatsApp, Email, LinkedIn). Vous pouvez aussi générer un QR code via la page "QR Code".',
  },
  {
    q: 'L\'agence parrainée doit-elle payer pour rejoindre BRH ?',
    a: 'Non. La charte partenariat BRH est gratuite (forfait Discovery 0 €). Aucun droit d\'entrée, aucun stock à constituer. C\'est un programme de recommandation, pas une vente pyramidale.',
  },
]

export default function AgenceParrainageHowItWorks() {
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
      <Link
        to="/agence/parrainage"
        className="inline-flex items-center gap-1 text-sm text-text-light hover:text-primary transition"
      >
        <ArrowLeft size={14} />
        Retour à mon réseau
      </Link>

      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
            <Network size={22} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-primary mb-0.5">
              Programme de recommandation
            </p>
            <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
              Comment ça marche ?
            </h1>
          </div>
        </div>
        <p className="text-text-secondary leading-relaxed mt-3 max-w-2xl">
          Quand vous parrainez une agence et qu'elle signe sa charte BRH, vous gagnez du cash
          + des leads bonus. La cascade s'étend sur 5 niveaux : vous touchez aussi sur les
          filleuls de vos filleuls, dégressivement.
        </p>
      </header>

      {/* Barème visuel */}
      <section>
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-light mb-3">
          Barème par niveau
        </h2>
        <div className="space-y-2">
          {LEVELS.map((b) => (
            <div
              key={b.lvl}
              className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-4 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center shrink-0 text-white font-bold text-lg shadow-md`}
              >
                N{b.lvl}
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary">{b.label}</p>
                <p className="text-xs text-text-light">
                  {b.lvl === 1
                    ? 'Vous parrainez directement cette agence.'
                    : `Filleul de ${b.lvl === 2 ? 'votre filleul' : `votre filleul à ${b.lvl - 1} niveau${b.lvl > 2 ? 'x' : ''}`}.`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary tabular-nums">{b.cash} €</p>
                <p className="text-xs text-primary font-bold">+{b.leads} leads</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-br from-primary/5 to-primary-dark/5 border border-primary/20 rounded-2xl p-4 mt-3">
          <p className="text-sm font-bold text-primary-dark">
            Total maximum par charte signée : 145 € HT cash + 12 leads bonus
          </p>
          <p className="text-xs text-primary-dark mt-1">
            Distribué entre 5 ancêtres distincts dans la chaîne. Cap absolu, jamais dépassé.
          </p>
        </div>
      </section>

      {/* Flow visuel */}
      <section>
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-light mb-3">
          Comment vous gagnez
        </h2>
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6 space-y-4">
          {[
            {
              icon: Network,
              title: '1. Vous partagez votre lien',
              desc: 'Sur la page « Mon réseau », copiez votre lien personnalisé ou téléchargez votre QR code. Partagez-le avec d\'autres agences immobilières.',
            },
            {
              icon: CheckCircle2,
              title: '2. Une agence s\'inscrit + signe sa charte',
              desc: 'Si elle suit votre lien et complète l\'onboarding (signature charte + email confirmé), notre système la lie automatiquement à votre agence.',
            },
            {
              icon: Sparkles,
              title: '3. Vous touchez votre commission',
              desc: 'Niveau 1 : 100 € HT + 5 leads. Niveaux 2-5 : si vos filleuls parrainent d\'autres agences, la cascade vous fait toucher aussi.',
            },
            {
              icon: Euro,
              title: '4. Versement cash + leads bonus',
              desc: 'Leads crédités immédiatement (consommables ce mois-ci). Cash versé le 15 du mois suivant validation par BRH (sur facture).',
            },
          ].map((step) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">{step.title}</p>
                  <p className="text-xs text-text-light mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Garde-fous */}
      <section>
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-light mb-3">
          Garde-fous
        </h2>
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Shield, label: 'Aucun droit d\'entrée — la charte BRH est gratuite' },
              { icon: CheckCircle2, label: 'Commission conditionnée à une signature réelle' },
              { icon: Calendar, label: 'Cap absolu à 5 niveaux de cascade' },
              { icon: Calendar, label: 'Cap mensuel : max 30 leads bonus parrainage / mois' },
              { icon: Shield, label: 'Détection automatique des cycles A→B→A' },
              { icon: Shield, label: 'Validation manuelle anti-fraude avant versement cash' },
            ].map((g) => {
              const Icon = g.icon
              return (
                <div key={g.label} className="flex items-start gap-2.5">
                  <Icon size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">{g.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-light mb-3 flex items-center gap-2">
          <HelpCircle size={14} className="text-primary" />
          Questions fréquentes
        </h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="bg-white rounded-2xl border border-neutral-light group"
            >
              <summary className="cursor-pointer p-4 font-bold text-sm text-text-primary flex items-center justify-between gap-2 list-none">
                {item.q}
                <span className="text-primary group-open:rotate-45 transition-transform text-lg leading-none shrink-0">
                  +
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm text-text-secondary leading-relaxed border-t border-neutral-light pt-3">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="text-center pt-4">
        <Link
          to="/agence/parrainage"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          <Network size={14} />
          Retour à mon réseau d'agences
        </Link>
      </div>
    </div>
  )
}
