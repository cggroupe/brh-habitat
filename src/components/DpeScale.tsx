import { DPE_CLASS_COLORS, type DpeClass } from '@/data/aides-renov'

interface DpeScaleProps {
  currentClass: string | null
  targetClass?: string | null
  compact?: boolean
}

const DPE_CLASSES: DpeClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

// Largeur croissante de A (court) a G (long)
const BAR_WIDTHS: Record<DpeClass, string> = {
  A: '45%',
  B: '52%',
  C: '60%',
  D: '68%',
  E: '77%',
  F: '86%',
  G: '95%',
}

const DPE_LABELS: Record<DpeClass, string> = {
  A: '< 70',
  B: '71-110',
  C: '111-180',
  D: '181-250',
  E: '251-330',
  F: '331-420',
  G: '> 420',
}

export function DpeScale({ currentClass, targetClass, compact = false }: DpeScaleProps) {
  const isValidClass = (c: string | null | undefined): c is DpeClass =>
    c != null && DPE_CLASSES.includes(c as DpeClass)

  return (
    <div
      className={`w-full animate-fadeIn ${compact ? 'space-y-1' : 'space-y-1.5'}`}
      role="img"
      aria-label={`Etiquette DPE — classe actuelle : ${currentClass ?? 'non renseignee'}`}
    >
      {!compact && (
        <div className="flex justify-between text-xs text-slate-400 font-medium mb-2 px-0.5">
          <span>Classe energetique</span>
          <span>kWh/m²/an</span>
        </div>
      )}

      {DPE_CLASSES.map((cls) => {
        const isCurrent = currentClass === cls
        const isTarget = targetClass === cls
        const color = DPE_CLASS_COLORS[cls]
        const barWidth = BAR_WIDTHS[cls]

        return (
          <div key={cls} className="relative flex items-center gap-2">
            {/* Barre coloriee */}
            <div
              className={`relative flex items-center justify-between px-3 rounded-r-lg transition-all ${
                compact ? 'h-6' : 'h-8'
              } ${isCurrent ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
              style={{ width: barWidth, backgroundColor: color, minWidth: compact ? 40 : 52 }}
            >
              <span
                className={`font-black text-white leading-none ${compact ? 'text-sm' : 'text-base'}`}
              >
                {cls}
              </span>
              {!compact && (
                <span className="text-white/80 text-xs font-medium">{DPE_LABELS[cls]}</span>
              )}
            </div>

            {/* Badge "Vous etes ici" */}
            {isCurrent && (
              <div className="flex items-center gap-1 animate-fadeIn">
                <div
                  className="w-3 h-0.5"
                  style={{ backgroundColor: color }}
                />
                <span
                  className={`font-bold whitespace-nowrap text-slate-800 ${compact ? 'text-xs' : 'text-xs'}`}
                >
                  Vous etes ici
                </span>
              </div>
            )}

            {/* Badge "Apres travaux" */}
            {isTarget && !isCurrent && (
              <div className="flex items-center gap-1 animate-fadeIn">
                <div className="w-3 h-0.5 bg-[#1c7b1d]" />
                <span className="text-xs font-bold text-[#1c7b1d] whitespace-nowrap">
                  Apres travaux
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Legende si currentClass et targetClass sont fournis */}
      {isValidClass(currentClass) && isValidClass(targetClass) && currentClass !== targetClass && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm border-2 border-slate-800"
              style={{ backgroundColor: DPE_CLASS_COLORS[currentClass as DpeClass] }}
            />
            Classe actuelle : <strong className="text-slate-700">{currentClass}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: DPE_CLASS_COLORS[targetClass as DpeClass] }}
            />
            Apres travaux : <strong className="text-[#1c7b1d]">{targetClass}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
