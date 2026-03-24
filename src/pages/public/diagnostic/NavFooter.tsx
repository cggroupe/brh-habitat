import { ArrowLeft, ArrowRight } from 'lucide-react'

interface NavFooterProps {
  step: number
  canProceed: boolean
  onPrev: () => void
  onNext: () => void
}

export function NavFooter({ step, canProceed, onPrev, onNext }: NavFooterProps) {
  if (step === 6) return null

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
        Etape {step} sur 6
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={step !== 5 && !canProceed}
        className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
      >
        Continuer
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
