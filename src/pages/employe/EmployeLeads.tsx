/**
 * EmployeLeads — Liste des RDV attribués à l'employé courant + quota.
 *
 * Phase V2.5 — leads progressifs. Le quota mensuel dépend du niveau d'activité :
 *   standard=5, pro=15, expert=35, master=∞
 *
 * Compteur leads_received_this_month incrémenté auto via trigger DB sur
 * INSERT brh_appointments avec assigned_employee_id non null.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { TrendingUp, Calendar, Phone, Mail, MapPin, AlertCircle, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMyEmployee } from '@/hooks/queries/brh-employees'
import { LEVEL_LEADS_QUOTA, LEVEL_THRESHOLDS, type EmployeeLevel } from '@/api/brh-employees'

interface AssignedAppointment {
  id: string
  type: string
  diagnostic_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  preferred_slot: string | null
  status: string
  created_at: string
  notes: string | null
}

const LEVEL_LABELS: Record<EmployeeLevel, string> = {
  standard: 'Standard',
  pro: 'Pro',
  expert: 'Expert',
  master: 'Master',
}

function getNextLevel(current: EmployeeLevel): EmployeeLevel | null {
  const order: EmployeeLevel[] = ['standard', 'pro', 'expert', 'master']
  const idx = order.indexOf(current)
  if (idx === -1 || idx === order.length - 1) return null
  return order[idx + 1]
}

export default function EmployeLeads() {
  const { data: employee, isLoading: loadingEmp } = useMyEmployee()

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['employee-appointments', employee?.id],
    queryFn: async (): Promise<AssignedAppointment[]> => {
      if (!employee) return []
      const { data, error } = await supabase
        .from('brh_appointments')
        .select('id, type, diagnostic_id, contact_name, contact_email, contact_phone, preferred_slot, status, created_at, notes')
        .eq('assigned_employee_id', employee.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AssignedAppointment[]
    },
    enabled: !!employee,
    staleTime: 30_000,
  })

  if (loadingEmp || !employee) {
    return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" /></div>
  }

  const quota = LEVEL_LEADS_QUOTA[employee.activity_level]
  const used = employee.leads_received_this_month
  const remaining = quota >= 999 ? '∞' : Math.max(0, quota - used)
  const usagePct = quota >= 999 ? 100 : Math.min(100, (used / quota) * 100)
  const overQuota = quota < 999 && used >= quota
  const nextLevelKey = getNextLevel(employee.activity_level)
  const nextLevelMin = nextLevelKey ? LEVEL_THRESHOLDS[nextLevelKey] : null

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Mes leads attribués</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-text mt-1 tracking-tight flex items-center gap-2">
            <TrendingUp size={24} style={{ color: '#003404' }} />
            {monthLabel}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            RDV particuliers qui vous ont été attribués via le simulateur public ou par l'admin BRH.
          </p>
        </div>
      </div>

      {/* Quota */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-white/70 mb-1">Quota mensuel</p>
            <p className="font-display text-4xl font-bold">{quota >= 999 ? '∞' : quota}</p>
            <p className="text-sm text-white/80 mt-1">Niveau <strong>{LEVEL_LABELS[employee.activity_level]}</strong></p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-white/70 mb-1">Utilisés</p>
            <p className="font-display text-4xl font-bold">{used}</p>
            <p className="text-sm text-white/80 mt-1">RDV reçus ce mois</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-white/70 mb-1">Restants</p>
            <p className="font-display text-4xl font-bold">{remaining}</p>
            <p className="text-sm text-white/80 mt-1">Dispos d'ici fin du mois</p>
          </div>
        </div>
        {quota < 999 && (
          <div className="mt-5">
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overQuota ? 'bg-red-300' : 'bg-emerald-300'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {overQuota && (
              <p className="text-sm text-red-200 mt-2 flex items-center gap-1.5">
                <AlertCircle size={14} /> Quota dépassé pour ce mois — montez de niveau pour en débloquer plus
              </p>
            )}
          </div>
        )}
      </div>

      {/* Boost niveau */}
      {nextLevelKey && nextLevelMin && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3 flex-wrap">
          <Award size={20} className="text-amber-700 shrink-0" />
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-bold text-amber-900">
              Passez niveau {LEVEL_LABELS[nextLevelKey]} pour {LEVEL_LEADS_QUOTA[nextLevelKey] >= 999 ? '∞' : LEVEL_LEADS_QUOTA[nextLevelKey]} leads/mois
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Il vous manque <strong>{nextLevelMin - employee.activity_score} pts</strong> · Envoyez des mails (+5/mail), publiez sur les réseaux (+10/post), recrutez des partenaires (+50)
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/employe/mails" className="px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs font-bold hover:bg-amber-800">+5 pts mail</Link>
            <Link to="/employe/social" className="px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs font-bold hover:bg-amber-800">+10 pts post</Link>
          </div>
        </div>
      )}

      {/* Liste des RDV */}
      {isLoading && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isLoading && appointments.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <Calendar size={36} className="mx-auto text-text-subtle mb-3" />
          <p className="text-base font-bold text-text">Aucun lead attribué pour le moment</p>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Activez vos créneaux dispo dans <Link to="/employe/calendrier" className="text-emerald-700 font-bold underline">Mon calendrier RDV</Link> pour apparaître au moment de la prise de RDV particulier.
          </p>
        </div>
      )}

      {appointments.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {appointments.map((apt) => {
            const statusColor = apt.status === 'demande' ? 'amber' : apt.status === 'confirme' ? 'emerald' : apt.status === 'annule' ? 'red' : 'slate'
            return (
              <div key={apt.id} className="p-4 flex items-start gap-4 hover:bg-canvas transition-colors">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#003404' }}>
                  <Calendar size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-display text-base font-bold text-text">
                      {apt.contact_name ?? 'Sans nom'}
                    </p>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border bg-${statusColor}-50 text-${statusColor}-700 border-${statusColor}-200`}
                    >
                      {apt.status}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border bg-slate-50 text-slate-700 border-slate-200">
                      {apt.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px] text-text-muted">
                    {apt.contact_phone && (
                      <a href={`tel:${apt.contact_phone}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                        <Phone size={11} /> {apt.contact_phone}
                      </a>
                    )}
                    {apt.contact_email && (
                      <a href={`mailto:${apt.contact_email}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                        <Mail size={11} /> {apt.contact_email}
                      </a>
                    )}
                    {apt.preferred_slot && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {apt.preferred_slot.split('\n')[0]}
                      </span>
                    )}
                  </div>
                  {apt.notes && (
                    <p className="text-[11px] text-text-subtle mt-1.5 line-clamp-2 italic">{apt.notes.split('\n')[0]}</p>
                  )}
                </div>
                <p className="text-[10px] text-text-subtle whitespace-nowrap">
                  {new Date(apt.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
