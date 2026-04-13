import { logError } from '@/lib/error'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'

// ---------------------------------------------------------------------------
// Config API
// ---------------------------------------------------------------------------

const BOOKING_API_URL = 'https://woicuzcxfdknxqdjuamj.supabase.co/functions/v1/public-booking'
const BRHCRM_ANON_KEY = import.meta.env.VITE_BRHCRM_ANON_KEY as string | undefined

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlot {
  date: string
  heure_debut: string
  heure_fin: string
}

interface CalendarPickerProps {
  departement?: string
  onSlotSelected: (slot: TimeSlot) => void
  selectedSlot?: TimeSlot | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retourne la date du prochain jour ouvrable (lun-ven) a partir de demain */
function nextWorkday(from: Date): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/** Retourne les 5 jours ouvrables de la semaine contenant `anchor` (lun-ven) */
function getWeekdays(anchor: Date): Date[] {
  // Trouver le lundi de la semaine
  const d = new Date(anchor)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const days: Date[] = []
  for (let i = 0; i < 5; i++) {
    const wd = new Date(d)
    wd.setDate(d.getDate() + i)
    days.push(wd)
  }
  return days
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatFullDate(date: string): string {
  const [y, m, day] = date.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function isToday(d: Date): boolean {
  const now = new Date()
  return toISODate(d) === toISODate(now)
}

function isPast(d: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function isMorningSlot(heure: string): boolean {
  const h = parseInt(heure.split(':')[0], 10)
  return h < 14
}

// ---------------------------------------------------------------------------
// Spinner inline
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[#1c7b1d]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function CalendarPicker({ departement, onSlotSelected, selectedSlot }: CalendarPickerProps) {
  const firstDay = nextWorkday(new Date())

  const [weekAnchor, setWeekAnchor] = useState<Date>(firstDay)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Si la clef API n'est pas configuree → fallback telephone
  if (!BRHCRM_ANON_KEY) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
        <Phone size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="font-body text-sm text-amber-800">
          Calendrier indisponible — appelez-nous au{' '}
          <a href="tel:0219005305" className="font-semibold underline">02 19 00 53 05</a>
          {' '}pour prendre rendez-vous.
        </p>
      </div>
    )
  }

  const weekdays = getWeekdays(weekAnchor)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Semaine precedente desactivee si elle est entierement passee
  const canGoPrev = weekdays[weekdays.length - 1] > today

  const prevWeek = () => {
    const prev = new Date(weekAnchor)
    prev.setDate(prev.getDate() - 7)
    setWeekAnchor(prev)
    setSelectedDate(null)
    setSlots([])
  }

  const nextWeek = () => {
    const next = new Date(weekAnchor)
    next.setDate(next.getDate() + 7)
    setWeekAnchor(next)
    setSelectedDate(null)
    setSlots([])
  }

  const handleDaySelect = (d: Date) => {
    if (isPast(d)) return
    const iso = toISODate(d)
    if (iso === selectedDate) return
    setSelectedDate(iso)
  }

  // Fetch des creneaux quand la date change
  useEffect(() => {
    if (!selectedDate) return

    let cancelled = false
    setIsLoading(true)
    setFetchError(null)
    setSlots([])

    const params = new URLSearchParams({ date: selectedDate, duree: '60' })
    if (departement) params.set('departement', departement)

    fetch(`${BOOKING_API_URL}?${params.toString()}`, {
      headers: {
        apikey: BRHCRM_ANON_KEY ?? '',
        Authorization: `Bearer ${BRHCRM_ANON_KEY ?? ''}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { slots?: TimeSlot[]; has_availability?: boolean }) => {
        if (cancelled) return
        setSlots(data.slots ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        logError('CalendarPicker fetch error', err)
        setFetchError('Impossible de charger les creneaux. Appelez-nous au 02 19 00 53 05.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDate, departement])

  const morningSlots = slots.filter((s) => isMorningSlot(s.heure_debut))
  const afternoonSlots = slots.filter((s) => !isMorningSlot(s.heure_debut))

  const SlotButton = ({ slot }: { slot: TimeSlot }) => {
    const isSelected =
      selectedSlot?.date === slot.date &&
      selectedSlot?.heure_debut === slot.heure_debut

    return (
      <button
        type="button"
        onClick={() => onSlotSelected(slot)}
        className={`px-3 py-2 rounded-lg border font-display text-xs transition-all ${
          isSelected
            ? 'bg-[#1c7b1d] border-[#1c7b1d] text-white shadow-sm shadow-[#1c7b1d]/25'
            : 'bg-white border-[#1c7b1d]/50 text-[#1c7b1d] hover:bg-[#1c7b1d]/10 hover:border-[#1c7b1d]'
        }`}
      >
        {slot.heure_debut}
      </button>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Navigation semaine */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={prevWeek}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Semaine precedente"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Jours — scroll horizontal sur mobile */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none flex-1 mx-2">
          {weekdays.map((d) => {
            const iso = toISODate(d)
            const past = isPast(d)
            const isSelected = iso === selectedDate
            const todayMark = isToday(d)
            const label = formatDayLabel(d)

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDaySelect(d)}
                disabled={past}
                className={`flex-1 min-w-[52px] px-1 py-2 rounded-lg border text-center transition-all text-xs leading-tight
                  ${isSelected
                    ? 'bg-[#1c7b1d] border-[#1c7b1d] text-white shadow-sm'
                    : past
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#1c7b1d]/50 hover:bg-[#1c7b1d]/5'
                  }`}
              >
                {todayMark && !isSelected && (
                  <span className="block w-1 h-1 rounded-full bg-[#1c7b1d] mx-auto mb-0.5" />
                )}
                <span className="font-display block capitalize">{label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={nextWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Semaine suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Zone creneaux */}
      <div className="px-4 pb-4">
        {!selectedDate && (
          <p className="text-center font-body text-xs text-slate-400 py-4">
            Selectionnez un jour pour voir les creneaux disponibles
          </p>
        )}

        {selectedDate && isLoading && (
          <div className="flex justify-center py-5">
            <Spinner />
          </div>
        )}

        {selectedDate && !isLoading && fetchError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-3 mt-2">
            <Phone size={14} className="text-red-400 shrink-0" />
            <p className="font-body text-xs text-red-600">{fetchError}</p>
          </div>
        )}

        {selectedDate && !isLoading && !fetchError && slots.length === 0 && (
          <p className="text-center font-body text-xs text-slate-400 py-4">
            Aucun creneau disponible ce jour. Essayez un autre jour.
          </p>
        )}

        {selectedDate && !isLoading && !fetchError && slots.length > 0 && (
          <div className="space-y-3 mt-2">
            {morningSlots.length > 0 && (
              <div>
                <p className="font-display text-xs text-slate-500 mb-2">Matin</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {morningSlots.map((slot) => (
                    <SlotButton key={`${slot.date}-${slot.heure_debut}`} slot={slot} />
                  ))}
                </div>
              </div>
            )}
            {afternoonSlots.length > 0 && (
              <div>
                <p className="font-display text-xs text-slate-500 mb-2">Apres-midi</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {afternoonSlots.map((slot) => (
                    <SlotButton key={`${slot.date}-${slot.heure_debut}`} slot={slot} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
