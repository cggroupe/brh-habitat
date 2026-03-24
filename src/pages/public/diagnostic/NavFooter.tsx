import { ArrowLeft, ArrowRight, Eye } from 'lucide-react'

interface NavFooterProps {
  step: number
  canProceed: boolean
  onPrev: () => void
  onNext: () => void
  totalSteps?: number
  isSubmitting?: boolean
}

export function NavFooter({
  step,
  canProceed,
  onPrev,
  onNext,
  totalSteps = 5,
  isSubmitting = false,
}: NavFooterProps) {
  const isLastStep = step === totalSteps

  return (
    <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-8">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 1}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <span className="text-sm font-bold text-slate-400">
        Etape {step} sur {totalSteps}
      </span>

      {isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting || !canProceed}
          className="flex items-center gap-2 px-10 py-3 rounded-xl bg-primary text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-primary/30"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyse en cours...
            </>
          ) : (
            <>
              <Eye size={18} />
              Voir mes resultats
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          Continuer
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}
