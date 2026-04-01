import { useState, useMemo } from 'react'
import { Pencil, Save, X, Droplets, Thermometer, Wind, Square, Zap, Home, Wrench, AlertTriangle, ShieldAlert, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import type { BrhHealthRecordRow, HealthDomain, HealthUrgency } from '@/types/database'
import { HEALTH_DOMAIN_LABELS, HEALTH_DOMAIN_COLORS, URGENCY_LABELS, URGENCY_COLORS } from '@/data/constants'
import { symptomsByType } from '@/data/symptoms'
import { healthImpacts, domainSummaries } from '@/data/health-impacts'
import type { DiagnosticType } from '@/stores/diagnosticStore'
import { getUrgencyFromScore } from './HealthScoreGauge'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Droplets, Thermometer, Wind, Square, Zap, Home, Wrench,
}

const DOMAIN_ICON: Record<HealthDomain, string> = {
  humidite: 'Droplets', isolation: 'Thermometer', ventilation: 'Wind',
  menuiseries: 'Square', electricite: 'Zap', toiture: 'Home', plomberie: 'Wrench',
}

interface Props {
  domain: HealthDomain
  record: BrhHealthRecordRow | null
  onSave: (domain: HealthDomain, score: number, symptoms: string[], notes: string) => void
}

export function HealthDomainCard({ domain, record, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(record?.symptoms ?? [])
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [showAllImpacts, setShowAllImpacts] = useState(false)

  const colors = HEALTH_DOMAIN_COLORS[domain]
  const iconName = DOMAIN_ICON[domain]
  const Icon = ICON_MAP[iconName] ?? Home
  const domainSymptoms = symptomsByType[domain as DiagnosticType] ?? []
  const summary = domainSummaries[domain]

  // Calcul du score automatique depuis les symptomes
  const score = useMemo(() => {
    const syms = editing ? selectedSymptoms : (record?.symptoms ?? [])
    if (domainSymptoms.length === 0 || syms.length === 0) return 0
    const maxWeight = domainSymptoms.reduce((sum, s) => sum + s.weight * 10, 0)
    const currentWeight = domainSymptoms
      .filter((s) => syms.includes(s.id))
      .reduce((sum, s) => sum + s.weight * 10, 0)
    return maxWeight > 0 ? Math.min(100, Math.round((currentWeight / maxWeight) * 100)) : 0
  }, [editing, selectedSymptoms, record?.symptoms, domainSymptoms])

  const urgency: HealthUrgency = getUrgencyFromScore(score)
  const urgencyConfig = URGENCY_COLORS[urgency]

  // Impacts sante pour les symptomes selectionnes
  const activeImpacts = useMemo(() => {
    const syms = editing ? selectedSymptoms : (record?.symptoms ?? [])
    return syms
      .map((symId) => healthImpacts[symId])
      .filter(Boolean)
  }, [editing, selectedSymptoms, record?.symptoms])

  // Message contextuel selon le score
  const contextMessage = score === 0 ? null
    : score < 25 ? summary.goodStateMessage
    : score < 60 ? summary.moderateMessage
    : summary.criticalMessage

  function handleSave() {
    onSave(domain, score, selectedSymptoms, notes)
    setEditing(false)
  }

  function handleCancel() {
    setSelectedSymptoms(record?.symptoms ?? [])
    setNotes(record?.notes ?? '')
    setEditing(false)
  }

  function toggleSymptom(id: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const hasData = record && (record.symptoms?.length ?? 0) > 0

  return (
    <div className={`rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-fadeIn ${editing ? 'ring-2 ring-primary/20' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${colors.bg}`}>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon size={20} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-slate-900">{HEALTH_DOMAIN_LABELS[domain]}</h3>
          {hasData && (
            <p className={`text-xs font-body ${urgencyConfig.text}`}>{URGENCY_LABELS[urgency]}</p>
          )}
          {!hasData && !editing && <p className="text-xs font-body text-slate-400">Non evalue</p>}
        </div>
        {hasData && (
          <div className="text-right shrink-0">
            <span className="font-accent text-2xl text-slate-900">{score}</span>
            <span className="font-body text-xs text-slate-400">/100</span>
          </div>
        )}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Evaluer"
          >
            <Pencil size={14} className="text-slate-500" />
          </button>
        )}
      </div>

      {/* Score bar */}
      {hasData && !editing && (
        <div className="px-5 pt-3 pb-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${urgencyConfig.bar}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}

      {/* === ANALYSE INTELLIGENTE (mode lecture) === */}
      {hasData && !editing && (
        <div className="px-5 py-4 space-y-4">
          {/* Message contextuel global */}
          {contextMessage && (
            <div className={`p-3 rounded-xl border ${urgencyConfig.bg} ${urgencyConfig.border}`}>
              <p className={`font-body text-sm leading-relaxed ${urgencyConfig.text}`}>
                {contextMessage}
              </p>
            </div>
          )}

          {/* Impacts sante detailles */}
          {activeImpacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={14} className="text-red-500" />
                <p className="font-display text-xs text-slate-500 uppercase tracking-wider">Impacts sur votre sante</p>
              </div>

              <div className="space-y-3">
                {(showAllImpacts ? activeImpacts : activeImpacts.slice(0, 2)).map((impact) => {
                  const sym = domainSymptoms.find((s) => s.id === impact.symptomId)
                  return (
                    <div key={impact.symptomId} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <p className="font-display text-xs text-slate-700">{sym?.label}</p>

                      {/* Risques sante */}
                      <div className="space-y-1">
                        {impact.healthRisks.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle size={11} className={`shrink-0 mt-0.5 ${risk.startsWith('DANGER') || risk.startsWith('URGENCE') ? 'text-red-500' : 'text-amber-500'}`} />
                            <p className={`font-body text-xs leading-snug ${risk.startsWith('DANGER') || risk.startsWith('URGENCE') ? 'text-red-700 font-semibold' : 'text-slate-600'}`}>{risk}</p>
                          </div>
                        ))}
                      </div>

                      {/* Conseil */}
                      <p className="font-body text-xs text-slate-500 leading-relaxed italic">{impact.advice}</p>

                      {/* Action requise */}
                      <div className="flex items-start gap-2 bg-white rounded-lg p-2">
                        <ShieldAlert size={12} className="text-primary shrink-0 mt-0.5" />
                        <p className="font-body text-xs text-primary leading-snug font-medium">{impact.actionRequired}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {activeImpacts.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllImpacts(!showAllImpacts)}
                  className="flex items-center gap-1 mt-2 text-xs font-body text-primary hover:underline"
                >
                  {showAllImpacts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showAllImpacts ? 'Voir moins' : `Voir les ${activeImpacts.length - 2} autres analyses`}
                </button>
              )}
            </div>
          )}

          {/* Notes utilisateur */}
          {record.notes && (
            <div>
              <p className="font-display text-xs text-slate-400 uppercase tracking-wider mb-1">Vos notes</p>
              <p className="font-body text-xs text-slate-500 leading-relaxed">{record.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* === MODE EDITION === */}
      {editing && (
        <div className="px-5 py-4 space-y-4 border-t border-slate-50">
          {/* Description du domaine */}
          <p className="font-body text-xs text-slate-500 leading-relaxed">{summary.description}</p>

          {/* Score en temps reel */}
          {selectedSymptoms.length > 0 && (
            <div className={`p-3 rounded-xl border ${urgencyConfig.bg} ${urgencyConfig.border}`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`font-display text-sm ${urgencyConfig.text}`}>{URGENCY_LABELS[urgency]}</p>
                <span className="font-accent text-lg text-slate-900">{score}/100</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${urgencyConfig.bar}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          )}

          {/* Symptomes checkboxes */}
          <div>
            <p className="font-display text-xs text-slate-500 uppercase tracking-wider mb-2">
              Quels problemes observez-vous ?
            </p>
            <div className="space-y-2">
              {domainSymptoms.map((sym) => {
                const isChecked = selectedSymptoms.includes(sym.id)
                const impact = healthImpacts[sym.id]
                return (
                  <div key={sym.id}>
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSymptom(sym.id)}
                        className="mt-0.5 accent-primary w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className={`font-body text-sm leading-snug ${isChecked ? 'text-slate-900 font-medium' : 'text-slate-600 group-hover:text-slate-800'}`}>
                          {sym.label}
                        </span>
                        {sym.urgency === 'high' && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-red-600 font-display">
                            <AlertTriangle size={10} /> Grave
                          </span>
                        )}
                      </div>
                    </label>
                    {/* Apercu impact si coche */}
                    {isChecked && impact && (
                      <div className="ml-6 mt-1 mb-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="font-body text-xs text-amber-800 leading-snug font-medium mb-1">
                          {impact.healthRisks[0]}
                        </p>
                        <p className="font-body text-xs text-amber-700 leading-snug">
                          {impact.advice}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="font-display text-xs text-slate-500 uppercase tracking-wider mb-1">Notes personnelles</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations supplementaires..."
              className="w-full px-3 py-2 border border-gray-light rounded-xl font-body text-sm text-text-primary bg-background focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-text-light"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Save size={14} /> Enregistrer l'evaluation
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 border border-gray-light text-text-light font-display text-sm rounded-xl hover:bg-background transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && !editing && (
        <div className="px-5 py-6 text-center">
          <p className="font-body text-sm text-slate-500 mb-1">{summary.description.slice(0, 100)}...</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 mt-3 bg-primary/10 text-primary font-display text-sm rounded-xl hover:bg-primary/20 transition-colors"
          >
            <Pencil size={14} /> Evaluer ce domaine
          </button>
        </div>
      )}
    </div>
  )
}
