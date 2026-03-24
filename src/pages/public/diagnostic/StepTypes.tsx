import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { diagnosticTypes } from '@/data/diagnostic-types'
import { DiagnosticIcon } from './DiagnosticIcon'

export function StepTypes() {
  const { selectedTypes, toggleType } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Quels problemes rencontrez-vous ?
        </h2>
        <p className="text-lg text-slate-500">
          Selectionnez un ou plusieurs domaines
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {diagnosticTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.id)
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => toggleType(type.id)}
              className={`flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group ${
                isSelected
                  ? 'border-primary bg-primary/[0.05]'
                  : 'border-slate-100 bg-white hover:border-primary/50'
              }`}
            >
              <div
                className={`size-14 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-50 text-slate-400 group-hover:text-primary'
                }`}
              >
                <DiagnosticIcon name={type.icon} size={26} />
              </div>
              <span
                className={`text-sm font-bold text-center leading-tight transition-colors ${
                  isSelected ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                {type.label}
              </span>
            </button>
          )
        })}
      </div>

      {selectedTypes.length > 0 && (
        <p className="mt-6 text-sm font-bold text-primary text-center">
          {selectedTypes.length} domaine{selectedTypes.length > 1 ? 's' : ''} selectionne{selectedTypes.length > 1 ? 's' : ''}
        </p>
      )}
    </>
  )
}
