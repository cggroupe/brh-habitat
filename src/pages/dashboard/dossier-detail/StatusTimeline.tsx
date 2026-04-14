import { CheckCircle2, Circle } from 'lucide-react'
import { CASE_STATUSES, CASE_STATUS_LABELS } from '@/data/constants'
import type { CaseStatus } from '@/types/database'

interface StatusTimelineProps {
  currentStatus: CaseStatus
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = CASE_STATUSES.indexOf(currentStatus)

  return (
    <div className="relative">
      {/* Line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-light" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${(currentIndex / (CASE_STATUSES.length - 1)) * (100 - 8)}%` }}
      />

      <div className="relative flex items-start justify-between">
        {CASE_STATUSES.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                isCompleted
                  ? 'border-primary bg-primary text-white'
                  : isCurrent
                  ? 'border-primary bg-surface text-primary'
                  : 'border-gray-light bg-surface text-text-light'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 size={14} />
                ) : isCurrent ? (
                  <Circle size={10} className="fill-primary" />
                ) : (
                  <Circle size={10} />
                )}
              </div>
              <div className="text-center">
                <p className={`text-[11px] font-display leading-tight ${
                  isPending ? 'text-text-light' : 'text-text-primary'
                }`}>
                  {CASE_STATUS_LABELS[step]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
