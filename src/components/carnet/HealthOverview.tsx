import type { BrhHomeRow, BrhHealthRecordRow, HealthDomain } from '@/types/database'
import { HEALTH_DOMAINS } from '@/data/constants'
import { HealthScoreGauge, getUrgencyFromScore } from './HealthScoreGauge'
import { HealthDomainCard } from './HealthDomainCard'
import { BretagneAlerts } from './BretagneAlerts'

interface Props {
  home: BrhHomeRow
  records: BrhHealthRecordRow[]
  onSaveDomain: (domain: HealthDomain, score: number, symptoms: string[], notes: string) => void
}

export function HealthOverview({ home, records, onSaveDomain }: Props) {
  const recordsByDomain = Object.fromEntries(
    records.map((r) => [r.domain, r])
  ) as Partial<Record<HealthDomain, BrhHealthRecordRow>>

  // Score global : moyenne des domaines evalues
  const evaluatedRecords = records.filter((r) => r.score != null)
  const globalScore = evaluatedRecords.length > 0
    ? Math.round(evaluatedRecords.reduce((sum, r) => sum + (r.score ?? 0), 0) / evaluatedRecords.length)
    : null

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Score global + alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jauge globale */}
        <div className="bg-surface rounded-2xl border border-gray-light p-6 flex flex-col items-center justify-center">
          {globalScore !== null ? (
            <>
              <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Score global</p>
              <HealthScoreGauge score={globalScore} urgency={getUrgencyFromScore(globalScore)} />
              <p className="font-body text-xs text-slate-400 mt-3">
                {evaluatedRecords.length} / {HEALTH_DOMAINS.length} domaines evalues
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="font-display text-sm text-text-primary mb-1">Aucune evaluation</p>
              <p className="font-body text-xs text-text-light">
                Evaluez chaque domaine pour obtenir un score global
              </p>
            </div>
          )}
        </div>

        {/* Alertes Bretagne */}
        <div className="lg:col-span-2">
          <BretagneAlerts home={home} records={records} />
          {records.length === 0 && (
            <div className="bg-surface rounded-2xl border border-gray-light p-6 text-center">
              <p className="font-display text-sm text-text-primary mb-1">Alertes contextuelles</p>
              <p className="font-body text-xs text-text-light">
                Les alertes specifiques a la Bretagne apparaitront ici apres vos evaluations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grille des 7 domaines */}
      <div>
        <h3 className="font-display text-base text-text-primary mb-4">Evaluation par domaine</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HEALTH_DOMAINS.map((domain) => (
            <HealthDomainCard
              key={domain}
              domain={domain}
              record={recordsByDomain[domain] ?? null}
              onSave={onSaveDomain}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
