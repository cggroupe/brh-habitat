import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useDiagnosticStore } from '@/stores/diagnosticStore'

interface StepPropertyProps {
  showYearError?: boolean
}

export function StepProperty({ showYearError = false }: StepPropertyProps) {
  const { property, setProperty } = useDiagnosticStore()
  const [yearTouched, setYearTouched] = useState(false)

  const yearIsEmpty = !property.year
  const showError = showYearError || yearTouched

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Parlez-nous de votre logement
        </h2>
        <p className="text-lg text-slate-500">
          Ces informations nous permettent d'affiner le diagnostic
        </p>
      </div>

      <div className="space-y-8">
        {/* Type */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Type de logement
          </label>
          <div className="flex gap-3">
            {(['Maison', 'Appartement'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProperty({ type: t })}
                className={`flex-1 py-4 px-5 rounded-xl border-2 font-bold text-base transition-all ${
                  property.type === t
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Adresse du bien
          </label>
          <input
            type="text"
            placeholder="12 rue de la Paix, 29000 Quimper"
            value={property.address ?? ''}
            onChange={(e) => setProperty({ address: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Surface + Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-bold text-slate-700 mb-3">
              Surface (m²)
            </label>
            <input
              type="number"
              min={10}
              max={2000}
              placeholder="85"
              value={property.surface ?? ''}
              onChange={(e) => setProperty({ surface: parseInt(e.target.value) || undefined })}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-slate-700 mb-1">
              Annee de construction{' '}
              <span className="text-red-500 font-black" aria-hidden>*</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">Necessaire pour evaluer l'etat de votre logement</p>
            <input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              placeholder="ex: 1975"
              value={property.year ?? ''}
              onChange={(e) => {
                setProperty({ year: parseInt(e.target.value) || undefined })
                setYearTouched(true)
              }}
              onBlur={() => setYearTouched(true)}
              className={`w-full px-5 py-4 rounded-xl border bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                showError && yearIsEmpty
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/20'
              }`}
              aria-required="true"
              aria-invalid={showError && yearIsEmpty ? 'true' : 'false'}
            />
            {showError && yearIsEmpty && (
              <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                <span aria-hidden>!</span>
                Veuillez renseigner l'annee de construction
              </p>
            )}
          </div>
        </div>

        {/* Floors */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Nombre d'etages
          </label>
          <div className="relative">
            <select
              value={property.floors ?? ''}
              onChange={(e) => setProperty({ floors: parseInt(e.target.value) || undefined })}
              className="w-full appearance-none px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10"
            >
              <option value="">Selectionnez...</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} etage{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  )
}
