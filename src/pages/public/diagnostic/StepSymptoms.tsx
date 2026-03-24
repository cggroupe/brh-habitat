import { Check } from 'lucide-react'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { diagnosticTypes } from '@/data/diagnostic-types'
import { symptomsByType } from '@/data/symptoms'
import { DiagnosticIcon } from './DiagnosticIcon'

const URGENCY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-slate-300',
}

export function StepSymptoms() {
  const { selectedTypes, symptoms, toggleSymptom } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Decrivez les symptomes observes
        </h2>
        <p className="text-lg text-slate-500">
          Cochez tout ce que vous observez dans votre logement
        </p>
      </div>

      <div className="space-y-6">
        {selectedTypes.map((typeId) => {
          const typeConfig = diagnosticTypes.find((t) => t.id === typeId)
          const typeSymptoms = symptomsByType[typeId] ?? []
          const selected = symptoms[typeId] ?? []

          if (!typeConfig) return null

          return (
            <div key={typeId} className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bgColor}`}>
                  <DiagnosticIcon name={typeConfig.icon} size={17} className={typeConfig.color} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">{typeConfig.label}</h3>
                {selected.length > 0 && (
                  <span className="ml-auto text-xs bg-primary text-white rounded-full px-2.5 py-0.5 font-bold">
                    {selected.length}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {typeSymptoms.map((symptom) => {
                  const isChecked = selected.includes(symptom.id)
                  return (
                    <label
                      key={symptom.id}
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSymptom(typeId, symptom.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-slate-700 flex-1 leading-snug">{symptom.label}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${URGENCY_DOT[symptom.urgency]}`}
                        title={`Urgence ${symptom.urgency}`}
                      />
                    </label>
                  )
                })}
              </div>

              {/* Nudge : aucun symptome coche */}
              {selected.length === 0 && typeSymptoms.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/50">
                  <p className="text-xs text-slate-400 italic">
                    Cochez au moins un symptome pour obtenir des recommandations
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Urgence haute
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
          Urgence moyenne
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
          Urgence faible
        </span>
      </div>
    </>
  )
}
