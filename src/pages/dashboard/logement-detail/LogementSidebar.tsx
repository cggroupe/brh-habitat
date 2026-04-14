import { Ruler, CalendarDays, Thermometer, Layers } from 'lucide-react'
import { HealthScoreGauge } from '@/components/carnet/HealthScoreGauge'
import type { BrhHomeRow } from '@/types/database'
import type { BrhHealthRecordRow } from '@/types/database'

interface LogementSidebarProps {
  home: BrhHomeRow
  healthRecords: BrhHealthRecordRow[]
}

export function LogementSidebar({ home, healthRecords }: LogementSidebarProps) {
  const evaluated = healthRecords.filter((r) => r.score != null)
  const avg = evaluated.length > 0
    ? Math.round(evaluated.reduce((s, r) => s + (r.score ?? 0), 0) / evaluated.length)
    : null

  return (
    <div className="space-y-6">
      {/* Score sante mini */}
      {avg !== null && (
        <div className="bg-surface rounded-2xl border border-gray-light p-6 flex flex-col items-center">
          <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Score sante</p>
          <HealthScoreGauge score={avg} size="sm" />
          <p className="font-body text-xs text-text-light mt-2">{evaluated.length} domaine{evaluated.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Quick info card */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6">
        <h2 className="font-display text-base text-text-primary mb-4">Résumé</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Ruler size={14} />
            </div>
            <div>
              <p className="text-xs font-body text-text-light">Surface</p>
              <p className="text-sm font-display text-text-primary">{home.surface} m²</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <CalendarDays size={14} />
            </div>
            <div>
              <p className="text-xs font-body text-text-light">Année de construction</p>
              <p className="text-sm font-display text-text-primary">{home.year_built}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Thermometer size={14} />
            </div>
            <div>
              <p className="text-xs font-body text-text-light">Chauffage</p>
              <p className="text-sm font-display text-text-primary">{home.heating_type ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Layers size={14} />
            </div>
            <div>
              <p className="text-xs font-body text-text-light">Isolation</p>
              <p className="text-sm font-display text-text-primary">{home.insulation_type ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date info */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6">
        <h2 className="font-display text-base text-text-primary mb-3">Historique</h2>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-body text-text-light">Ajouté le</p>
            <p className="text-sm font-body text-text-primary">
              {new Date(home.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-body text-text-light">Dernière modification</p>
            <p className="text-sm font-body text-text-primary">
              {new Date(home.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
