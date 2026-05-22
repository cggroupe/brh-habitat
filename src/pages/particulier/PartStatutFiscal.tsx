import { useState, useMemo } from 'react'
import {
  Scale,
  Euro,
  TrendingUp,
  ShieldCheck,
  Gift,
  CreditCard,
  FileText,
  Calculator,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  simulate,
  formatEuros,
  PROFILE_META,
  SEUILS,
  type SituationFiscale,
  type Profile,
} from '@/lib/fiscal-simulator'

// ─── Constantes UI ──────────────────────────────────────────────────────────
const SITUATION_LABELS: Record<SituationFiscale, string> = {
  faible:  'Moins de 28 000 EUR',
  moyenne: 'Entre 28 000 et 50 000 EUR',
  elevee:  'Plus de 50 000 EUR',
}

const PROFILE_BADGE_CLASS: Record<Profile, string> = {
  loisirs:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  occasionnel:'bg-lime-50 text-lime-700 border-lime-200',
  regulier:   'bg-amber-50 text-amber-700 border-amber-200',
  metier:     'bg-blue-50 text-blue-700 border-blue-200',
}

// ─── Sections pedagogiques ──────────────────────────────────────────────────
interface FaqItem { q: string; a: string }

const FAQ: FaqItem[] = [
  {
    q: 'Pourquoi je ne suis pas salarie de BRH ?',
    a: "Le salariat implique un lien de subordination (horaires imposes, directives, hierarchie). Toi, tu es libre : tu parraines quand tu veux, comme tu veux. Le statut d'affilie te laisse la liberte complete et n'impose aucune obligation de resultat. Tu restes maitre de ton temps.",
  },
  {
    q: 'Comment je cree ma micro-entreprise en 15 minutes ?',
    a: "Rendez-vous sur autoentrepreneur.urssaf.fr. Tu choisis le code APE 74.90B (apporteur d'affaires). Tu remplis ton identite, adresse, RIB. Tu recois ton SIRET sous 7 jours par email. Cout : 0 EUR. Tu n'as rien a envoyer par courrier. Ensuite tu ajoutes ton SIRET dans ton profil BRH et tu es pret.",
  },
  {
    q: 'C\'est quoi la DAS2 et pourquoi BRH la fait ?',
    a: "La DAS2 est une declaration annuelle que BRH remplit aupres des impots pour indiquer les sommes versees a un apporteur d'affaires au-dela de 1 200 EUR/an. C'est une simple ligne dans la DSN de janvier, 5 minutes. Pour toi : aucune action. C'est juste une transparence fiscale cote BRH, pas une charge pour toi.",
  },
  {
    q: 'Si je veux arreter, ca se passe comment ?',
    a: "Tu desactives ton profil dans les parametres et c'est fini. Si tu as cree une micro-entreprise, tu peux la cloturer en 2 minutes sur autoentrepreneur.urssaf.fr, a tout moment, sans penalites. Tu peux aussi la mettre en sommeil si tu veux reprendre plus tard.",
  },
  {
    q: 'Qu\'est-ce que je recupere en commissions ?',
    a: "Tu touches un pourcentage du montant TTC des travaux signes grace a ton parrainage. Les taux varient selon le type de travaux (toiture, isolation, menuiserie, etc.) et ton niveau d'affilie. Tu vois le detail en temps reel dans ton tableau de bord.",
  },
  {
    q: 'Je peux cumuler avec mon salaire / chomage / retraite ?',
    a: "Oui, la micro-entreprise est cumulable avec un emploi salarie, les allocations chomage (avec un regime specifique), la retraite, le RSA. Dans tous les cas on te recommande de signaler ton activite secondaire a ton employeur principal par prudence (pas d'exclusivite dans ton contrat).",
  },
]

// ─── Accordeon item ─────────────────────────────────────────────────────────
function AccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(27,28,28,0.04)] overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-background/50 transition-colors"
      >
        <span className="font-bold text-text-primary pr-4">{item.q}</span>
        <ChevronDown
          size={18}
          className={`text-text-light shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 pt-1 text-sm text-text-secondary leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function PartStatutFiscal() {
  const [caMensuel, setCaMensuel] = useState(500)
  const [frequency, setFrequency] = useState<'mois' | 'an'>('mois')
  const [situation, setSituation] = useState<SituationFiscale>('faible')
  const [hasSiret, setHasSiret] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const caAnnuel = frequency === 'mois' ? caMensuel * 12 : caMensuel
  const result = useMemo(() => simulate({ caAnnuel, situation, hasSiret }), [caAnnuel, situation, hasSiret])
  const meta = PROFILE_META[result.profile]

  const sliderMax = frequency === 'mois' ? 4_000 : 48_000
  const sliderStep = frequency === 'mois' ? 50 : 500

  return (
    <div className="p-6 lg:p-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">
            Accompagnement fiscal
          </p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
            Paiements &amp; Statut
          </h1>
          <p className="font-body text-sm text-text-secondary mt-2 max-w-2xl">
            Tout ce que tu dois savoir pour gagner sereinement avec ton activite d'affilie. Pas de jargon, pas de peur,
            juste les faits et les bons reflexes.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/10 rounded-2xl px-5 py-3">
          <ShieldCheck size={18} className="text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Zero risque</p>
            <p className="text-xs text-primary font-medium">Conforme URSSAF &amp; DGFiP 2026</p>
          </div>
        </div>
      </div>

      {/* ── Cartes pedagogie rapide (3 canaux) ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <ChannelCard
          icon={Gift}
          color="emerald"
          title="Bons cadeaux"
          sub="Amazon, Leroy Merlin, Darty…"
          limit={`Jusqu'a ${formatEuros(SEUILS.CADEAUX_EXONERES)}/an sans aucune demarche`}
          bullets={['Aucune fiscalite', 'Aucune paperasse', 'Livraison directe']}
        />
        <ChannelCard
          icon={Sparkles}
          color="amber"
          title="Credit travaux BRH"
          sub="Bonus +20 % sur tes points"
          limit="Pas de limite, pas d'impot"
          bullets={['Rabais sur ton prochain chantier', 'Equivalent euros immediats', 'Cumulable']}
        />
        <ChannelCard
          icon={CreditCard}
          color="blue"
          title="Virement bancaire"
          sub="Sur ton compte"
          limit="Des que tu as un SIRET"
          bullets={['Commission % du devis', 'Facture generee auto', 'Cumul avec salaire possible']}
        />
      </div>

      {/* ── SIMULATEUR ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(27,28,28,0.06)] overflow-hidden mb-10">
        {/* Header simu */}
        <div className="px-6 lg:px-8 py-6 bg-gradient-to-br from-primary via-primary to-primary-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calculator size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-[0.04em] uppercase text-white">
                Simulateur fiscal
              </h2>
              <p className="text-xs text-green-100/80 font-body mt-0.5">
                Dis-nous combien tu envisages de gagner, on te dit quoi faire
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Colonne Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Toggle frequence */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
                Mode d'estimation
              </label>
              <div className="inline-flex p-1 bg-background rounded-xl">
                {(['mois', 'an'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      frequency === f
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-text-light hover:text-text-secondary'
                    }`}
                  >
                    Par {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider montant */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
                Gains estimes par {frequency}
              </label>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-display text-4xl font-bold text-primary">
                  {formatEuros(caMensuel)}
                </span>
                <span className="text-sm text-text-light">/ {frequency}</span>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={sliderStep}
                value={caMensuel}
                onChange={e => setCaMensuel(Number(e.target.value))}
                className="w-full h-2 bg-background rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-text-light mt-1.5 uppercase tracking-wider">
                <span>0</span>
                <span>{formatEuros(sliderMax)}</span>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Soit <strong className="text-text-primary">{formatEuros(caAnnuel)}</strong> sur 12 mois
              </p>
            </div>

            {/* Situation */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
                Ton revenu principal annuel
                <span className="text-text-light/60 font-normal normal-case ml-1">(optionnel)</span>
              </label>
              <select
                value={situation}
                onChange={e => setSituation(e.target.value as SituationFiscale)}
                className="w-full px-4 py-3 bg-background rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                {(Object.keys(SITUATION_LABELS) as SituationFiscale[]).map(s => (
                  <option key={s} value={s}>
                    {SITUATION_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* SIRET */}
            <label className="flex items-start gap-3 p-4 bg-background rounded-xl cursor-pointer hover:bg-background/70 transition-colors">
              <input
                type="checkbox"
                checked={hasSiret}
                onChange={e => setHasSiret(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <div>
                <p className="text-sm font-bold text-text-primary">J'ai deja un SIRET</p>
                <p className="text-xs text-text-light mt-0.5">
                  Micro-entreprise, auto-entrepreneur, autre activite independante
                </p>
              </div>
            </label>
          </div>

          {/* Colonne Resultats */}
          <div className="lg:col-span-3 space-y-5">
            {/* Profil detecte */}
            <div className={`border-2 rounded-2xl p-5 ${PROFILE_BADGE_CLASS[result.profile]}`}>
              <div className="flex items-start gap-4">
                <div className="text-4xl shrink-0">{meta.emoji}</div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">
                    Ton profil
                  </p>
                  <p className="font-display text-lg font-bold uppercase tracking-[0.04em]">
                    {meta.label}
                  </p>
                  <p className="text-sm mt-1 opacity-90">{meta.description}</p>
                </div>
              </div>
            </div>

            {/* Cartes chiffres */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                icon={Euro}
                label="Net dans ta poche"
                value={formatEuros(result.net)}
                sub={`soit ${formatEuros(result.netMensuel)}/mois`}
                highlight
              />
              <StatCard
                icon={TrendingUp}
                label="Prelevements totaux"
                value={`${result.tauxPrelevementGlobal.toFixed(1)} %`}
                sub={formatEuros(result.totalCharges)}
              />
            </div>

            {/* Detail des charges (si regulier ou metier) */}
            {(result.profile === 'regulier' || result.profile === 'metier') && (
              <div className="bg-background rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
                  Detail des charges
                </p>
                <div className="space-y-2 text-sm">
                  <ChargeLine label="Cotisations sociales SSI (21,2 %)" value={result.cotisationsSSI} />
                  <ChargeLine label="Formation pro (0,2 %)" value={result.cfp} />
                  <ChargeLine
                    label={
                      result.optionVersementLiberatoire
                        ? 'Impot liberatoire (2,2 %)'
                        : 'Impot sur le revenu'
                    }
                    value={result.impotRevenu}
                  />
                  <div className="pt-2 mt-2 border-t border-white flex items-center justify-between">
                    <span className="font-bold text-text-primary">Total</span>
                    <span className="font-bold text-text-primary">{formatEuros(result.totalCharges)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Obligations affilie */}
            <InfoBlock
              icon={FileText}
              title="Ce que TU dois faire"
              items={result.obligations}
              color="amber"
            />

            {/* Actions BRH */}
            <InfoBlock
              icon={ShieldCheck}
              title="Ce que BRH fait pour toi"
              items={result.obligationsBrh}
              color="emerald"
            />

            {/* Avantages */}
            <InfoBlock
              icon={CheckCircle2}
              title="Tes avantages"
              items={result.avantagesAffilie}
              color="primary"
            />

            {/* Alertes */}
            {result.alertes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-2">A savoir</p>
                    <ul className="space-y-1.5">
                      {result.alertes.map((a, i) => (
                        <li key={i} className="text-sm text-amber-800">• {a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <a
              href={result.ctaUrl}
              target={result.ctaUrl.startsWith('http') ? '_blank' : undefined}
              rel={result.ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
            >
              {result.ctaLabel}
              {result.ctaUrl.startsWith('http') && <ExternalLink size={14} />}
            </a>
          </div>
        </div>
      </div>

      {/* ── Tableau recap seuils ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(27,28,28,0.04)] p-6 lg:p-8 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-[0.04em] uppercase text-text-primary">
              Les seuils a connaitre
            </h2>
            <p className="text-xs text-text-light">Memoire visuelle : ou tu te situes</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-background text-[10px] uppercase tracking-widest text-text-light">
                <th className="text-left py-3 font-bold">Gain annuel</th>
                <th className="text-left py-3 font-bold">Statut</th>
                <th className="text-left py-3 font-bold">Demarches</th>
              </tr>
            </thead>
            <tbody>
              <TrRow range="0 – 196 EUR" badge="Loisirs" color="emerald" demarches="Aucune, juste des cadeaux" />
              <TrRow range="196 – 1 200 EUR" badge="Occasionnel" color="lime" demarches="Declarer BNC en fin d'annee (5 min)" />
              <TrRow range="1 200 – 5 000 EUR" badge="Regulier" color="amber" demarches="Micro-entreprise recommandee + DAS2 cote BRH" />
              <TrRow range="5 000 – 36 800 EUR" badge="Metier" color="blue" demarches="Micro-entreprise obligatoire, franchise TVA active" />
              <TrRow range="36 800 – 77 700 EUR" badge="Metier +" color="indigo" demarches="Assujettissement TVA, facturation TTC" />
              <TrRow range="Au-dela de 77 700 EUR" badge="Regime reel" color="violet" demarches="Sortie micro, comptable recommande" />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Info size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-[0.04em] uppercase text-text-primary">
              Questions frequentes
            </h2>
            <p className="text-xs text-text-light">On a anticipe tes doutes</p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </div>

      {/* ── Footer disclaimer ──────────────────────────────────────────────── */}
      <div className="text-center py-6 text-xs text-text-light max-w-2xl mx-auto">
        <p className="leading-relaxed">
          Les informations de cette page sont a titre indicatif et correspondent a la reglementation francaise en
          vigueur en 2026. Pour ta situation personnelle, BRH te recommande de consulter ton centre des impots ou un
          expert-comptable.
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────
interface ChannelCardProps {
  icon: React.ElementType
  color: 'emerald' | 'amber' | 'blue'
  title: string
  sub: string
  limit: string
  bullets: string[]
}

function ChannelCard({ icon: Icon, color, title, sub, limit, bullets }: ChannelCardProps) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  }[color]

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(27,28,28,0.04)] hover:shadow-[0_8px_30px_rgba(27,28,28,0.08)] transition-all">
      <div className={`w-11 h-11 rounded-xl ${colorMap.bg} ${colorMap.text} flex items-center justify-center mb-4`}>
        <Icon size={20} />
      </div>
      <p className="font-display font-bold text-lg text-text-primary mb-0.5">{title}</p>
      <p className="text-xs text-text-light mb-3">{sub}</p>
      <div className={`inline-block text-xs font-bold ${colorMap.text} ${colorMap.bg} px-3 py-1.5 rounded-lg mb-4`}>
        {limit}
      </div>
      <ul className="space-y-1.5">
        {bullets.map(b => (
          <li key={b} className="text-xs text-text-secondary flex items-start gap-1.5">
            <span className="text-primary mt-0.5">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        highlight
          ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
          : 'bg-background text-text-primary'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={highlight ? 'text-white/70' : 'text-text-light'} />
        <p className={`text-[10px] uppercase tracking-widest font-bold ${highlight ? 'text-white/70' : 'text-text-light'}`}>
          {label}
        </p>
      </div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${highlight ? 'text-white/80' : 'text-text-light'}`}>{sub}</p>
      )}
    </div>
  )
}

function ChargeLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-bold text-text-primary">{formatEuros(value)}</span>
    </div>
  )
}

function InfoBlock({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ElementType
  title: string
  items: string[]
  color: 'emerald' | 'amber' | 'primary'
}) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-800',   icon: 'text-amber-600' },
    primary: { bg: 'bg-primary/5',  text: 'text-primary-dark', icon: 'text-primary' },
  }[color]

  return (
    <div className={`${colorMap.bg} rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={colorMap.icon} />
        <p className={`text-[10px] uppercase tracking-widest font-bold ${colorMap.text}`}>{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={`text-sm ${colorMap.text} flex items-start gap-2`}>
            <span className={`${colorMap.icon} mt-0.5`}>→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrRow({
  range,
  badge,
  color,
  demarches,
}: {
  range: string
  badge: string
  color: 'emerald' | 'lime' | 'amber' | 'blue' | 'indigo' | 'violet'
  demarches: string
}) {
  const colorClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    lime:    'bg-lime-50 text-lime-700',
    amber:   'bg-amber-50 text-amber-700',
    blue:    'bg-blue-50 text-blue-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    violet:  'bg-violet-50 text-violet-700',
  }[color]

  return (
    <tr className="border-b border-background/60 hover:bg-background/30 transition-colors">
      <td className="py-4 pr-4 font-bold text-text-primary">{range}</td>
      <td className="py-4 pr-4">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${colorClass}`}>{badge}</span>
      </td>
      <td className="py-4 text-sm text-text-secondary">{demarches}</td>
    </tr>
  )
}
