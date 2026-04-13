import { useMemo } from 'react'
import { formatLocalDate } from '@/lib/utils'

export interface DispoSlot {
  date: string // YYYY-MM-DD
  periode: 'matin' | 'apres-midi'
}

interface CalendarWidgetProps {
  onSlotsChange: (slots: DispoSlot[]) => void
  selectedSlots: DispoSlot[]
}

// Nombre de semaines a afficher (semaine courante + 2 suivantes)
const WEEKS_AHEAD = 3

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=dim, 1=lun...
  const diff = day === 0 ? -6 : 1 - day // ramene au lundi
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function dateKey(date: Date): string {
  return formatLocalDate(date)
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function isToday(date: Date): boolean {
  return formatLocalDate(date) === formatLocalDate(new Date())
}

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

// Genere les jours ouvrables (lun-ven) pour N semaines a partir d'aujourd'hui
function generateWeeks(weeksAhead: number): Date[][] {
  const today = new Date()
  const start = getWeekStart(today)
  const weeks: Date[][] = []

  for (let w = 0; w < weeksAhead; w++) {
    const week: Date[] = []
    for (let d = 0; d < 5; d++) { // lundi a vendredi
      week.push(addDays(start, w * 7 + d))
    }
    weeks.push(week)
  }

  return weeks
}


export function CalendarWidget({ onSlotsChange, selectedSlots }: CalendarWidgetProps) {
  const weeks = useMemo(() => generateWeeks(WEEKS_AHEAD), [])

  function isSelected(date: Date, periode: 'matin' | 'apres-midi'): boolean {
    const key = dateKey(date)
    return selectedSlots.some((s) => s.date === key && s.periode === periode)
  }

  function toggleSlot(date: Date, periode: 'matin' | 'apres-midi') {
    if (isPast(date)) return
    const key = dateKey(date)
    const already = selectedSlots.some((s) => s.date === key && s.periode === periode)
    let next: DispoSlot[]
    if (already) {
      next = selectedSlots.filter((s) => !(s.date === key && s.periode === periode))
    } else {
      next = [...selectedSlots, { date: key, periode }].sort((a, b) =>
        a.date.localeCompare(b.date) || a.periode.localeCompare(b.periode),
      )
    }
    onSlotsChange(next)
  }

  // Grouper les semaines par mois pour afficher les separateurs
  const weekMonths = weeks.map((week) => monthLabel(week[0]))

  return (
    <div className="w-full">
      {/* Legende periode */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1c7b1d]/20 border border-[#1c7b1d]/40" />
          <span className="font-body text-xs text-slate-500">Matin (8h-12h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1c7b1d]/20 border border-[#1c7b1d]/40" />
          <span className="font-body text-xs text-slate-500">Apres-midi (14h-18h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1c7b1d] border border-[#1c7b1d]" />
          <span className="font-body text-xs text-slate-500">Selectionne</span>
        </div>
      </div>

      {/* Vue desktop : grille par semaine */}
      <div className="hidden sm:block space-y-4">
        {weeks.map((week, wi) => (
          <div key={wi}>
            {/* Separateur mois si changement */}
            {(wi === 0 || weekMonths[wi] !== weekMonths[wi - 1]) && (
              <p className="font-body text-xs text-slate-400 mb-2 capitalize">{weekMonths[wi]}</p>
            )}
            <div className="grid grid-cols-5 gap-2">
              {week.map((day) => {
                const past = isPast(day)
                const today = isToday(day)
                const matinSel = isSelected(day, 'matin')
                const apremSel = isSelected(day, 'apres-midi')

                return (
                  <div
                    key={dateKey(day)}
                    className={`rounded-xl border p-2 ${
                      past ? 'opacity-40 pointer-events-none' : ''
                    } ${today ? 'border-[#1c7b1d]/40 bg-green-50/30' : 'border-slate-200'}`}
                  >
                    {/* Jour */}
                    <div className="text-center mb-2">
                      <p className={`font-display text-xs ${today ? 'text-[#1c7b1d]' : 'text-slate-600'}`}>
                        {dayLabel(day)}
                      </p>
                      {today && (
                        <span className="inline-block mt-0.5 font-body text-[9px] text-[#1c7b1d] uppercase tracking-wide">
                          auj.
                        </span>
                      )}
                    </div>

                    {/* Matin */}
                    <button
                      type="button"
                      onClick={() => toggleSlot(day, 'matin')}
                      disabled={past}
                      className={`w-full py-1.5 rounded-lg text-xs font-body transition-all mb-1.5 border ${
                        matinSel
                          ? 'bg-[#1c7b1d] text-white border-[#1c7b1d]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#1c7b1d]/50 hover:bg-green-50/50'
                      } disabled:pointer-events-none`}
                    >
                      Matin
                    </button>

                    {/* Apres-midi */}
                    <button
                      type="button"
                      onClick={() => toggleSlot(day, 'apres-midi')}
                      disabled={past}
                      className={`w-full py-1.5 rounded-lg text-xs font-body transition-all border ${
                        apremSel
                          ? 'bg-[#1c7b1d] text-white border-[#1c7b1d]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#1c7b1d]/50 hover:bg-green-50/50'
                      } disabled:pointer-events-none`}
                    >
                      Ap-midi
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Vue mobile : cartes empilees par jour */}
      <div className="sm:hidden space-y-2">
        {weeks.map((week, wi) => (
          <div key={wi}>
            {(wi === 0 || weekMonths[wi] !== weekMonths[wi - 1]) && (
              <p className="font-body text-xs text-slate-400 mt-3 mb-2 capitalize">{weekMonths[wi]}</p>
            )}
            {week.map((day) => {
              const past = isPast(day)
              const today = isToday(day)
              const matinSel = isSelected(day, 'matin')
              const apremSel = isSelected(day, 'apres-midi')

              return (
                <div
                  key={dateKey(day)}
                  className={`rounded-xl border p-3 ${
                    past ? 'opacity-40 pointer-events-none' : ''
                  } ${today ? 'border-[#1c7b1d]/40 bg-green-50/30' : 'border-slate-100 bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`font-display text-sm ${today ? 'text-[#1c7b1d]' : 'text-slate-700'} capitalize`}>
                        {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {today && <span className="ml-1 font-body text-[10px] text-[#1c7b1d] uppercase">• auj.</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSlot(day, 'matin')}
                        disabled={past}
                        className={`px-3 py-1.5 rounded-lg text-xs font-body transition-all border ${
                          matinSel
                            ? 'bg-[#1c7b1d] text-white border-[#1c7b1d]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1c7b1d]/50'
                        }`}
                      >
                        Matin
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSlot(day, 'apres-midi')}
                        disabled={past}
                        className={`px-3 py-1.5 rounded-lg text-xs font-body transition-all border ${
                          apremSel
                            ? 'bg-[#1c7b1d] text-white border-[#1c7b1d]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1c7b1d]/50'
                        }`}
                      >
                        Ap-midi
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Recapitulatif des slots selectionnes */}
      {selectedSlots.length > 0 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="font-body text-xs text-green-700 font-medium mb-1.5">
            {selectedSlots.length} creneau{selectedSlots.length > 1 ? 'x' : ''} selectionne{selectedSlots.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedSlots.map((s, i) => {
              const [y, m, d] = s.date.split('-').map(Number)
              const dateObj = new Date(y, m - 1, d)
              const label = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSlotsChange(selectedSlots.filter((_, idx) => idx !== i))}
                  title="Supprimer ce creneau"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-body text-xs hover:bg-red-100 hover:text-red-600 transition-colors capitalize"
                >
                  {label} — {s.periode === 'matin' ? 'Matin' : 'Ap-midi'}
                  <span className="text-[10px] opacity-60 ml-0.5">✕</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
