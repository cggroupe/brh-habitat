import { BadgeEuro, Zap } from 'lucide-react'

interface AidesCardProps {
  budgetMin: number
  budgetMax: number
  mprAmount: number
  ceeAmount: number
  resteAChargeMin: number
  resteAChargeMax: number
  revenueProfile: string | null
  ecoPtz: boolean
  tvaReduite: boolean
}

function formatEur(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function AidesCard({
  budgetMin,
  budgetMax,
  mprAmount,
  ceeAmount,
  resteAChargeMin,
  resteAChargeMax,
  revenueProfile,
  ecoPtz,
  tvaReduite,
}: AidesCardProps) {
  const totalAides = mprAmount + ceeAmount

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* En-tete — Cout estime */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          Cout estime des travaux
        </p>
        <p className="text-sm text-slate-400 line-through">
          {formatEur(budgetMin)} – {formatEur(budgetMax)}
        </p>
      </div>

      {/* Decomposition des aides */}
      <div className="px-5 py-4 space-y-2.5 border-b border-slate-50">
        {mprAmount > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <BadgeEuro size={14} className="text-primary" />
              </div>
              <span className="text-sm text-slate-600">MaPrimeRenov'</span>
            </div>
            <span className="text-sm font-bold text-primary">- {formatEur(mprAmount)}</span>
          </div>
        )}

        {ceeAmount > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Zap size={14} className="text-primary-green" />
              </div>
              <span className="text-sm text-slate-600">CEE</span>
            </div>
            <span className="text-sm font-bold text-primary-green">- {formatEur(ceeAmount)}</span>
          </div>
        )}

        {totalAides === 0 && (
          <p className="text-xs text-slate-400 italic">Aucune aide directe estimee pour ce profil</p>
        )}
      </div>

      {/* Reste a charge */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Reste a charge
        </p>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {formatEur(resteAChargeMin)}
          {resteAChargeMin !== resteAChargeMax && (
            <span className="text-lg font-bold text-slate-400"> – {formatEur(resteAChargeMax)}</span>
          )}
        </p>

        {/* Badges */}
        {(ecoPtz || tvaReduite) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {ecoPtz && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-1">
                Eligible eco-PTZ
              </span>
            )}
            {tvaReduite && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-50 text-primary border border-green-100 rounded-full px-2.5 py-1">
                TVA 5,5%
              </span>
            )}
          </div>
        )}

        {/* Avertissement si pas de profil revenu */}
        {!revenueProfile && (
          <p className="mt-3 text-xs text-slate-400 italic leading-relaxed">
            Estimation basee sur un profil median. Renseignez votre tranche de revenus pour un calcul personnalise.
          </p>
        )}
      </div>
    </div>
  )
}
