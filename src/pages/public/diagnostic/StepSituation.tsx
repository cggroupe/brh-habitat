import { Home, Building2, HelpCircle } from 'lucide-react'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { SIMPLE_REVENUE_RANGES, REVENUE_PROFILE_COLORS } from '@/data/aides-renov'
import type { RevenueProfile } from '@/data/aides-renov'

const HOUSEHOLD_SIZES = [1, 2, 3, 4, 5]

export function StepSituation() {
  const { situation, updateSituation } = useDiagnosticStore()

  const { ownerType, householdSize, knowsRevenue, revenueProfile } = situation

  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Votre situation
        </h2>
        <p className="text-lg text-slate-500">
          Ces informations nous permettent d'estimer les aides auxquelles vous avez droit
        </p>
      </div>

      <div className="space-y-8">
        {/* Question 1 : Type de propriete */}
        <div>
          <p className="text-base font-bold text-slate-700 mb-3">
            Etes-vous proprietaire ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSituation({ ownerType: 'occupant' })}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                ownerType === 'occupant'
                  ? 'border-primary bg-primary/[0.05] text-primary'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-primary/40'
              }`}
            >
              <div
                className={`size-12 rounded-full flex items-center justify-center transition-colors ${
                  ownerType === 'occupant' ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <Home size={22} />
              </div>
              <span className="text-sm font-bold text-center leading-tight">
                Proprietaire occupant
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateSituation({ ownerType: 'bailleur' })}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                ownerType === 'bailleur'
                  ? 'border-primary bg-primary/[0.05] text-primary'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-primary/40'
              }`}
            >
              <div
                className={`size-12 rounded-full flex items-center justify-center transition-colors ${
                  ownerType === 'bailleur' ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <Building2 size={22} />
              </div>
              <span className="text-sm font-bold text-center leading-tight">
                Proprietaire bailleur
              </span>
            </button>
          </div>
        </div>

        {/* Question 2 : Taille du foyer */}
        <div>
          <p className="text-base font-bold text-slate-700 mb-3">
            Combien de personnes dans votre foyer ?
          </p>
          <div className="flex gap-2">
            {HOUSEHOLD_SIZES.map((n) => {
              const isSelected = householdSize === n
              const label = n === 5 ? '5+' : String(n)
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateSituation({ householdSize: n })}
                  className={`flex-1 aspect-square rounded-full text-sm font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                  style={{ minWidth: 44, maxWidth: 56 }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Question 3 : Revenu fiscal */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-base font-bold text-slate-700">
              Connaissez-vous votre revenu fiscal de reference ?
            </p>
            <div className="relative group">
              <HelpCircle size={15} className="text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 leading-relaxed">
                Retrouvez-le sur votre avis d'imposition, case "Revenu fiscal de reference"
              </div>
            </div>
          </div>

          {/* Toggle Oui/Non */}
          <div className="flex gap-3 mb-4">
            {([
              { value: true, label: 'Oui' },
              { value: false, label: 'Non, pas forcement' },
            ] as const).map(({ value, label }) => (
              <button
                key={String(value)}
                type="button"
                onClick={() =>
                  updateSituation({
                    knowsRevenue: value,
                    revenueProfile: value ? revenueProfile : null,
                  })
                }
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  knowsRevenue === value
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tranches de revenus (si Oui) */}
          {knowsRevenue === true && (
            <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
              {SIMPLE_REVENUE_RANGES.map((range) => {
                const isSelected = revenueProfile === range.profile
                const colorClasses = REVENUE_PROFILE_COLORS[range.profile as RevenueProfile]

                return (
                  <button
                    key={range.profile}
                    type="button"
                    onClick={() => updateSituation({ revenueProfile: range.profile as RevenueProfile })}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-slate-100 hover:border-primary/30'
                    } ${colorClasses}`}
                  >
                    <span className="text-xs font-black leading-tight">{range.label}</span>
                    <span className="text-xs opacity-75 leading-snug">{range.description}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Message si Non */}
          {knowsRevenue === false && (
            <div className="animate-fadeIn bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
              <p className="text-sm text-slate-500 leading-relaxed">
                Pas de souci ! Nous estimerons vos aides sur un profil moyen. Vous pourrez affiner plus tard.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
