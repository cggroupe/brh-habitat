import { Check } from 'lucide-react'

const DEFAULT_STEP_LABELS = [
  'Domaines',
  'Logement',
  'Situation',
  'Equipements',
  'Symptomes',
  'Contact',
]

interface HorizontalStepperProps {
  step: number
  stepLabels?: string[]
}

export function HorizontalStepper({ step, stepLabels = DEFAULT_STEP_LABELS }: HorizontalStepperProps) {
  const STEP_LABELS = stepLabels
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-4">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = step > stepNum
        const isCurrent = step === stepNum
        const isLast = idx === STEP_LABELS.length - 1

        return (
          <div key={label} className="flex flex-col items-center gap-2 flex-1 relative">
            {/* Circle */}
            {isCompleted ? (
              <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold z-10 shrink-0">
                <Check size={14} strokeWidth={3} />
              </div>
            ) : isCurrent ? (
              <div className="size-10 rounded-full border-4 border-primary/20 bg-primary text-white flex items-center justify-center text-sm font-bold z-10 shadow-lg shadow-primary/20 shrink-0">
                {stepNum}
              </div>
            ) : (
              <div className="size-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold z-10 shrink-0">
                {stepNum}
              </div>
            )}

            {/* Label */}
            <span
              className={`text-xs hidden sm:block transition-colors ${
                isCompleted
                  ? 'font-bold text-primary'
                  : isCurrent
                    ? 'font-black text-primary uppercase'
                    : 'font-medium text-slate-400'
              }`}
            >
              {label}
            </span>

            {/* Connector line to the right — drawn from center of this step */}
            {!isLast && (
              <div
                className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors ${
                  isCompleted ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
