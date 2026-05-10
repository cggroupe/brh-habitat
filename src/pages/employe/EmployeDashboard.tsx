/**
 * EmployeDashboard — Cockpit principal pour les employés BRH.
 *
 * V1 : score d'activité, niveau, leads débloqués, actions recommandées.
 * V2 (à venir) : intégrer les vraies données (brh_employee_actions DB),
 * templates emails, calendrier RDV, publications réseaux sociaux.
 */
import { Link } from 'react-router-dom'
import {
  Award,
  TrendingUp,
  Mail,
  Share2,
  ArrowRight,
  Sparkles,
  Target,
  Calendar,
  Zap,
} from 'lucide-react'
import { useMyEmployee } from '@/hooks/queries/brh-employees'
import { LEVEL_LEADS_QUOTA, LEVEL_THRESHOLDS, type EmployeeLevel } from '@/api/brh-employees'

const LEVEL_LABELS: Record<EmployeeLevel, string> = {
  standard: 'Standard',
  pro: 'Pro',
  expert: 'Expert',
  master: 'Master',
}
const LEVEL_COLORS: Record<EmployeeLevel, string> = {
  standard: '#71717a',
  pro: '#0284c7',
  expert: '#7c3aed',
  master: '#f59e0b',
}

function getNextLevel(current: EmployeeLevel): EmployeeLevel | null {
  const order: EmployeeLevel[] = ['standard', 'pro', 'expert', 'master']
  const idx = order.indexOf(current)
  if (idx === -1 || idx === order.length - 1) return null
  return order[idx + 1]
}

export default function EmployeDashboard() {
  const { data: employee, isLoading } = useMyEmployee()

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" /></div>
  }
  if (!employee) {
    return <div className="p-8">Employé non reconnu — contactez l'admin.</div>
  }

  const levelColor = LEVEL_COLORS[employee.activity_level]
  const levelLabel = LEVEL_LABELS[employee.activity_level]
  const leadsQuota = LEVEL_LEADS_QUOTA[employee.activity_level]
  const nextLevelKey = getNextLevel(employee.activity_level)
  const nextLevelMin = nextLevelKey ? LEVEL_THRESHOLDS[nextLevelKey] : null
  const currentMin = LEVEL_THRESHOLDS[employee.activity_level]
  const pointsToNext = nextLevelMin ? nextLevelMin - employee.activity_score : 0
  const progressPct = nextLevelMin
    ? Math.min(100, ((employee.activity_score - currentMin) / (nextLevelMin - currentMin)) * 100)
    : 100

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">
            {today}
          </p>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-text mt-1 tracking-tight">
            Bonjour, <span style={{ color: '#00600a' }}>{employee.full_name.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">{employee.role_label}</p>
        </div>
        <div
          className="px-4 py-2 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2"
          style={{ backgroundColor: levelColor }}
        >
          <Award size={13} />
          Niveau {levelLabel}
        </div>
      </div>

      {/* Score activité + progression vers prochain niveau */}
      <div
        className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #003404 0%, #00600a 100%)`,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              Score d'activité
            </p>
            <p className="font-display text-4xl font-bold">{employee.activity_score} pts</p>
            <p className="text-sm text-white/80 mt-2">
              Niveau actuel : <strong style={{ color: levelColor }}>{levelLabel}</strong>
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              Leads débloqués / mois
            </p>
            <p className="font-display text-4xl font-bold">
              {leadsQuota >= 999 ? "∞" : leadsQuota}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {nextLevelKey
                ? `Passez ${LEVEL_LABELS[nextLevelKey]} pour ${LEVEL_LEADS_QUOTA[nextLevelKey] >= 999 ? '∞' : LEVEL_LEADS_QUOTA[nextLevelKey]} leads/mois`
                : 'Niveau maximum atteint 🏆'}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              Mise en avant
            </p>
            <p className="font-display text-4xl font-bold">3e</p>
            <p className="text-sm text-white/80 mt-2">
              sur 8 employés affichés au RDV particulier
            </p>
          </div>
        </div>

        {nextLevelKey && (
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-xs text-white/80 mb-2">
              <span>Progression vers <strong>{LEVEL_LABELS[nextLevelKey!]}</strong></span>
              <span className="font-bold">{pointsToNext} pts à gagner</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: '#86efac' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions à faire pour gagner des points */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-text flex items-center gap-2">
            <Zap size={20} style={{ color: '#f59e0b' }} />
            Boostez votre score
          </h2>
          <span className="text-xs text-text-muted">Plus vous êtes actif, plus vous débloquez de leads</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            icon={<Mail size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
            title="Envoyer un mail recrutement"
            points="+5 pts / mail"
            description="Templates artisans, agences, architectes, MOE"
            href="/employe/mails"
          />
          <ActionCard
            icon={<Calendar size={20} className="text-amber-600" />}
            iconBg="bg-amber-50"
            title="Activer mes créneaux RDV"
            points="Mise en avant"
            description="Plus actif = plus visible au RDV particulier"
            href="/employe/calendrier"
          />
          <ActionCard
            icon={<Share2 size={20} className="text-purple-600" />}
            iconBg="bg-purple-50"
            title="Publier sur réseaux sociaux"
            points="+10 pts / post"
            description="LinkedIn / TikTok / Instagram avec 6 templates BRH"
            href="/employe/social"
          />
          <ActionCard
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="Mes leads attribués"
            points={`${employee.leads_received_this_month} reçus / ${LEVEL_LEADS_QUOTA[employee.activity_level] >= 999 ? '∞' : LEVEL_LEADS_QUOTA[employee.activity_level]}`}
            description="Quota mensuel selon votre niveau"
            href="/employe/leads"
          />
        </div>
      </div>

      {/* Modules actifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          to="/employe/foncier/carte"
          icon={<Target size={22} />}
          color="#0284c7"
          title="Foncier cadastre"
          description="Carte interactive Bretagne · 59 306 prospects DPE F/G en base"
          badge="Actif"
        />
        <ModuleCard
          to="/employe/foncier/prospects"
          icon={<TrendingUp size={22} />}
          color="#059669"
          title="Prospects DPE F/G"
          description="Liste filtrable par département, score v2, contact enrichi"
          badge="Actif"
        />
        <ModuleCard
          to="/employe/simulateur"
          icon={<Sparkles size={22} />}
          color="#d97706"
          title="Simulateur énergétique"
          description="Aides MaPrimeRénov + DPE projeté + reste à charge"
          badge="Actif"
        />
        <ModuleCard
          to="/reseau"
          icon={<Share2 size={22} />}
          color="#7c3aed"
          title="Réseau pro"
          description="Fil d'actualité, chantiers à pourvoir, messagerie"
          badge="Actif"
        />
        <ModuleCard
          to="/employe/foncier/tertiaire"
          icon={<Award size={22} />}
          color="#dc2626"
          title="Tertiaire en liquidation"
          description="BODACC + permis Sit@del2 + rapprochement chantier"
          badge="Actif"
        />
        <ModuleCard
          to="#"
          icon={<Mail size={22} />}
          color="#6b7280"
          title="Templates emails"
          description="Recrutement artisans, agences, architectes, MOE"
          badge="Bientôt"
          disabled
        />
      </div>

      {/* Roadmap */}
      <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
        <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
          <Sparkles size={14} />
          Tous les modules sont actifs ✅
        </h3>
        <ul className="space-y-1.5 text-sm text-emerald-800">
          <li>📧 <Link to="/employe/mails" className="underline font-semibold">Templates emails de recrutement</Link> · 4 templates · +5 pts par envoi · tracking dans la plateforme</li>
          <li>📅 <Link to="/employe/calendrier" className="underline font-semibold">Calendrier RDV exposé</Link> · 7 jours × 2 périodes · vous apparaissez aux particuliers selon votre score</li>
          <li>📱 <Link to="/employe/social" className="underline font-semibold">Publications réseaux sociaux</Link> · 6 templates BRH · +10 pts par publication</li>
          <li>🎯 <Link to="/employe/leads" className="underline font-semibold">Leads progressifs</Link> · quota mensuel selon niveau · 5 → 15 → 35 → ∞</li>
        </ul>
      </div>
    </div>
  )
}

function ActionCard({
  icon,
  iconBg,
  title,
  points,
  description,
  badge,
  href,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  points: string
  description: string
  badge?: string
  href?: string
}) {
  const Wrapper = href ? Link : 'div'
  return (
    <Wrapper
      to={href ?? ''}
      className={`rounded-xl border border-border bg-canvas p-4 transition-all block ${
        href ? 'hover:border-emerald-300 hover:shadow-sm cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">
            {badge}
          </span>
        )}
        {href && !badge && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5">
            Actif
          </span>
        )}
      </div>
      <p className="text-[13px] font-bold text-text leading-tight">{title}</p>
      <p className="text-[11px] text-text-muted mt-1 leading-snug">{description}</p>
      <p className="text-xs font-bold mt-2" style={{ color: '#00600a' }}>
        {points}
      </p>
    </Wrapper>
  )
}

function ModuleCard({
  to,
  icon,
  color,
  title,
  description,
  badge,
  disabled,
}: {
  to: string
  icon: React.ReactNode
  color: string
  title: string
  description: string
  badge?: string
  disabled?: boolean
}) {
  const Wrapper = disabled ? 'div' : Link
  return (
    <Wrapper
      to={to}
      className={`group bg-surface border border-border rounded-2xl p-5 transition-all ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-emerald-300 hover:shadow-md cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        {badge && (
          <span
            className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${
              disabled
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-display text-base font-bold text-text mb-1 flex items-center gap-1.5">
        {title}
        {!disabled && (
          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        )}
      </h3>
      <p className="text-[12px] text-text-muted leading-snug">{description}</p>
    </Wrapper>
  )
}
