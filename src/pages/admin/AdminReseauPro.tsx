/**
 * Page Admin — vue globale Réseau Pro + dashboard top employés.
 * Route : /admin/reseau-pro
 */
import { Sparkles, Trophy, MapPin, Briefcase } from 'lucide-react'
import { useReseauStats } from '@/hooks/queries/brh-reseau-pro'
import ReseauListView from '@/components/reseau-pro/ReseauListView'

export default function AdminReseauPro() {
  const { data: stats } = useReseauStats('global')

  return (
    <div className="flex h-full flex-col">
      {/* Dashboard admin compact (au-dessus de la liste) */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Kpi label="Total annuaire" value={stats?.total ?? 0} icon={<Sparkles size={14} />} />
            <Kpi label="Disponibles" value={stats?.free ?? 0} color="green" icon={<Briefcase size={14} />} />
            <Kpi label="Déjà claim" value={stats?.claimed ?? 0} color="amber" icon={<Trophy size={14} />} />
            <Kpi label="Partenaires actifs" value={stats?.by_status?.partenaire ?? 0} color="green" />
            <Kpi label="RDV pris" value={stats?.by_status?.rdv_pris ?? 0} color="amber" />
            <Kpi label="Refus" value={stats?.by_status?.refus ?? 0} color="red" />
          </div>

          {stats?.top_employees && stats.top_employees.length > 0 && (
            <div className="mt-4 rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">
                Top employés (par nombre de prospects suivis)
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.top_employees.slice(0, 10).map((e) => (
                  <div
                    key={e.user_id}
                    className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-stone-200 px-3 py-1 text-xs"
                  >
                    <span className="font-medium text-text">{e.name ?? 'Inconnu'}</span>
                    <span className="font-bold text-[#00600a]">{e.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats?.by_dept && Object.keys(stats.by_dept).length > 0 && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <MapPin size={12} className="opacity-60" />
              Par département :
              {Object.entries(stats.by_dept)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([dept, n]) => (
                  <span key={dept} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-stone-200">
                    <strong className="text-text">{dept}</strong> · {Number(n).toLocaleString('fr-FR')}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ReseauListView variant="admin" />
      </div>
    </div>
  )
}

function Kpi({
  label, value, color, icon,
}: { label: string; value: number; color?: 'green' | 'amber' | 'red'; icon?: React.ReactNode }) {
  const colorClass =
    color === 'green' ? 'text-[#00600a]'
    : color === 'amber' ? 'text-amber-700'
    : color === 'red' ? 'text-red-700'
    : 'text-text'
  return (
    <div className="rounded-2xl bg-white ring-1 ring-stone-200 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-muted">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${colorClass}`}>
        {value.toLocaleString('fr-FR')}
      </div>
    </div>
  )
}
