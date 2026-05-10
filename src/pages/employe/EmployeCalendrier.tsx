/**
 * EmployeCalendrier — Gestion des créneaux récurrents dispo (Phase V2.3).
 *
 * Grille hebdomadaire (lundi-dimanche × matin/après-midi). Toggle pour activer
 * ou désactiver chaque créneau. Les créneaux 'available' sont exposés publiquement
 * via brh_available_employees_for_slot() lors de la prise de RDV particulier.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Sun, Moon, CheckCircle2, Circle, Award } from 'lucide-react'
import { useMyEmployee } from '@/hooks/queries/brh-employees'
import { employeeCalendarApi, type CalendarPeriod } from '@/api/employee-calendar'

const DAYS = [
  { dow: 1, label: 'Lundi' },
  { dow: 2, label: 'Mardi' },
  { dow: 3, label: 'Mercredi' },
  { dow: 4, label: 'Jeudi' },
  { dow: 5, label: 'Vendredi' },
  { dow: 6, label: 'Samedi' },
  { dow: 0, label: 'Dimanche' },
] as const

const PERIODS: { key: CalendarPeriod; label: string; icon: React.ReactNode; range: string }[] = [
  { key: 'morning', label: 'Matin', icon: <Sun size={14} />, range: '8h - 12h' },
  { key: 'afternoon', label: 'Après-midi', icon: <Moon size={14} />, range: '14h - 18h' },
]

export default function EmployeCalendrier() {
  const qc = useQueryClient()
  const { data: employee } = useMyEmployee()
  const [optimisticSlots, setOptimisticSlots] = useState<Record<string, boolean>>({})

  const { data: slots = [] } = useQuery({
    queryKey: ['employee-calendar', employee?.id],
    queryFn: () => (employee ? employeeCalendarApi.getMine(employee.id) : Promise.resolve([])),
    enabled: !!employee,
    staleTime: 30_000,
  })

  const slotsMap = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const s of slots) m[`${s.day_of_week}-${s.period}`] = s.status === 'available'
    return { ...m, ...optimisticSlots }
  }, [slots, optimisticSlots])

  const toggleMutation = useMutation({
    mutationFn: async (input: { dow: number; period: CalendarPeriod; isAvailable: boolean }) => {
      if (!employee) throw new Error('Non employé')
      await employeeCalendarApi.toggleSlot(employee.id, input.dow, input.period, input.isAvailable)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-calendar'] })
    },
  })

  function handleToggle(dow: number, period: CalendarPeriod) {
    const key = `${dow}-${period}`
    const newValue = !slotsMap[key]
    setOptimisticSlots((prev) => ({ ...prev, [key]: newValue }))
    toggleMutation.mutate({ dow, period, isAvailable: newValue })
  }

  const totalAvailable = Object.values(slotsMap).filter(Boolean).length

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Calendrier RDV</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-text mt-1 tracking-tight flex items-center gap-2">
            <Calendar size={24} style={{ color: '#003404' }} />
            Mes créneaux dispo
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Vos créneaux activés sont proposés aux particuliers qui prennent RDV après leur diagnostic. Plus votre score est élevé, plus votre profil apparaît en tête de liste.
          </p>
        </div>
        {employee && (
          <div className="rounded-xl bg-surface border border-border p-4 text-right">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Score actuel</p>
            <p className="font-display text-2xl font-bold mt-1" style={{ color: '#00600a' }}>
              {employee.activity_score} pts
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Niveau <strong>{employee.activity_level}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 mb-6 flex items-center gap-3">
        <Award size={20} className="text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900">
          <strong>{totalAvailable} créneaux activés</strong> · les particuliers verront votre profil sur ces créneaux.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[180px_1fr_1fr] border-b border-border bg-canvas">
          <div className="p-4 font-bold text-sm">Jour</div>
          {PERIODS.map((p) => (
            <div key={p.key} className="p-4 font-bold text-sm flex items-center gap-2 border-l border-border">
              {p.icon}
              <span>{p.label}</span>
              <span className="text-text-muted text-xs font-normal ml-auto">{p.range}</span>
            </div>
          ))}
        </div>

        {DAYS.map((day, i) => (
          <div key={day.dow} className={`grid grid-cols-[180px_1fr_1fr] ${i < DAYS.length - 1 ? 'border-b border-border' : ''}`}>
            <div className="p-4 font-semibold text-sm flex items-center">{day.label}</div>
            {PERIODS.map((p) => {
              const key = `${day.dow}-${p.key}`
              const isAvailable = slotsMap[key] ?? false
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleToggle(day.dow, p.key)}
                  className={`p-4 border-l border-border text-left transition-colors group ${
                    isAvailable ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-canvas'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <CheckCircle2 size={18} className="text-emerald-700" />
                    ) : (
                      <Circle size={18} className="text-text-subtle" />
                    )}
                    <span className={`text-sm font-semibold ${isAvailable ? 'text-emerald-900' : 'text-text-muted'}`}>
                      {isAvailable ? 'Disponible' : 'Cliquer pour activer'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-bold mb-1">💡 Comment ça marche</p>
        <ul className="space-y-1 list-disc pl-5 text-amber-900">
          <li>Activez les créneaux où vous êtes habituellement disponible (ex: lundi-vendredi matin)</li>
          <li>Les créneaux sont récurrents chaque semaine</li>
          <li>Lors de la prise de RDV, le particulier voit jusqu'à 3 employés dispo, triés par score</li>
          <li>Plus votre score d'activité est élevé, plus vous remontez en tête de liste</li>
        </ul>
      </div>
    </div>
  )
}
