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
  Users,
  Share2,
  ArrowRight,
  Sparkles,
  Target,
  Calendar,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getBrhEmployee, ACTIVITY_THRESHOLDS, getNextLevel } from '@/lib/brh-employees'

export default function EmployeDashboard() {
  const { user } = useAuth()
  const employee = getBrhEmployee(user?.email)

  if (!employee) {
    return <div className="p-8">Employé non reconnu.</div>
  }

  const levelCfg = ACTIVITY_THRESHOLDS[employee.activity_level]
  const nextLevelKey = getNextLevel(employee.activity_level)
  const nextLevelCfg = nextLevelKey ? ACTIVITY_THRESHOLDS[nextLevelKey] : null
  const pointsToNext = nextLevelCfg ? nextLevelCfg.min_score - employee.activity_score : 0
  const progressPct = nextLevelCfg
    ? Math.min(100, ((employee.activity_score - levelCfg.min_score) / (nextLevelCfg.min_score - levelCfg.min_score)) * 100)
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
          style={{ backgroundColor: levelCfg.color }}
        >
          <Award size={13} />
          Niveau {levelCfg.label}
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
              Niveau actuel : <strong style={{ color: levelCfg.color }}>{levelCfg.label}</strong>
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              Leads débloqués / mois
            </p>
            <p className="font-display text-4xl font-bold">
              {levelCfg.max_leads_month >= 999 ? '∞' : levelCfg.max_leads_month}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {nextLevelCfg
                ? `Passez ${nextLevelCfg.label} pour ${nextLevelCfg.max_leads_month >= 999 ? '∞' : nextLevelCfg.max_leads_month} leads/mois`
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

        {nextLevelCfg && (
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-xs text-white/80 mb-2">
              <span>Progression vers <strong>{nextLevelCfg.label}</strong></span>
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
            title="Envoyer 5 mails recrutement"
            points="+25 pts"
            description="Templates artisans, agences, architectes"
            badge="Bientôt"
          />
          <ActionCard
            icon={<Users size={20} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="Recruter 1 partenaire signé"
            points="+50 pts"
            description="Charte signée par un nouvel artisan ou agence"
            badge="Bientôt"
          />
          <ActionCard
            icon={<Share2 size={20} className="text-purple-600" />}
            iconBg="bg-purple-50"
            title="Publier sur réseaux sociaux"
            points="+10 pts / post"
            description="LinkedIn / TikTok / Instagram"
            badge="Bientôt"
          />
          <ActionCard
            icon={<Calendar size={20} className="text-amber-600" />}
            iconBg="bg-amber-50"
            title="Tenir 3 RDV particuliers"
            points="+30 pts"
            description="Avec compte-rendu dans la plateforme"
            badge="Bientôt"
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
      <div className="mt-8 rounded-2xl bg-amber-50 border border-amber-200 p-5">
        <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
          <Sparkles size={14} />
          À développer dans les prochaines semaines
        </h3>
        <ul className="space-y-1.5 text-sm text-amber-800">
          <li>📧 <strong>Templates emails de prospection</strong> (artisans, agences immo, architectes, MOE) avec signature personnalisée Pierre Collard et tracking ouverture/clic.</li>
          <li>📅 <strong>Calendrier RDV employé</strong> exposé sur la prise de RDV particulier (ContactRdvModal). Plus le score est haut, plus le profil est mis en avant.</li>
          <li>📱 <strong>Module publications réseaux sociaux</strong> (LinkedIn, TikTok, Instagram) avec templates de posts BRH et tracking.</li>
          <li>🎯 <strong>Système d'attribution leads progressif</strong> branché sur le score réel (table brh_employee_actions à créer).</li>
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
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  points: string
  description: string
  badge?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[13px] font-bold text-text leading-tight">{title}</p>
      <p className="text-[11px] text-text-muted mt-1 leading-snug">{description}</p>
      <p className="text-xs font-bold mt-2" style={{ color: '#00600a' }}>
        {points}
      </p>
    </div>
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
