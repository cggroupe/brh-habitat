import { Wrench } from 'lucide-react'
import { BretagneAlerts } from '@/components/carnet/BretagneAlerts'
import { HEALTH_DOMAIN_LABELS, WORK_STATUS_LABELS, WORK_STATUS_COLORS } from '@/data/constants'
import type { BrhHomeRow, BrhHealthRecordRow } from '@/types/database'

interface WorkItem {
  id: string
  title: string
  domain: string
  cost: number | null
  status: string | null
}

interface DocumentItem {
  expires_at: string | null
  title: string
}

interface AlertsWorkSectionProps {
  home: BrhHomeRow
  healthRecords: BrhHealthRecordRow[]
  plannedWorks: WorkItem[]
  expiredDocs: DocumentItem[]
}

export function AlertsWorkSection({ home, healthRecords, plannedWorks, expiredDocs }: AlertsWorkSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      {/* Alertes Bretagne */}
      <div>
        <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Alertes</p>
        <BretagneAlerts home={home} records={healthRecords} maxAlerts={3} />
        {healthRecords.length === 0 && expiredDocs.length === 0 && (
          <div className="bg-surface rounded-2xl border border-gray-light p-4 text-center">
            <p className="font-body text-xs text-text-light">Aucune alerte</p>
          </div>
        )}
        {expiredDocs.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-display text-sm text-red-700 mb-1">{expiredDocs.length} document{expiredDocs.length > 1 ? 's' : ''} expire{expiredDocs.length > 1 ? 's' : ''}</p>
            <p className="font-body text-xs text-red-600">
              {expiredDocs.map((d) => d.title).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Travaux a venir */}
      <div>
        <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Travaux a venir</p>
        {plannedWorks.length > 0 ? (
          <div className="space-y-2">
            {plannedWorks.map((w) => (
              <div key={w.id} className="bg-surface rounded-xl border border-gray-light p-4 flex items-center gap-3">
                <Wrench size={16} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm text-text-primary truncate">{w.title}</p>
                  <p className="font-body text-xs text-text-light">
                    {w.domain !== 'autre' ? HEALTH_DOMAIN_LABELS[w.domain as keyof typeof HEALTH_DOMAIN_LABELS] : 'Autre'}
                    {w.cost != null && ` — ${w.cost.toLocaleString('fr-FR')} EUR`}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-display ${WORK_STATUS_COLORS[(w.status ?? 'planifie') as keyof typeof WORK_STATUS_COLORS]}`}>
                  {WORK_STATUS_LABELS[(w.status ?? 'planifie') as keyof typeof WORK_STATUS_LABELS]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-gray-light p-4 text-center">
            <p className="font-body text-xs text-text-light">Aucun travail planifie</p>
          </div>
        )}
      </div>
    </div>
  )
}
