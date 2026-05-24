/**
 * Phase 16.0.9 admin — `/admin/agence-audits`.
 *
 * Traitement des audits aléatoires mensuels (5 % des leads contactés).
 * Permet de voir les retours propriétaires, identifier les agences abusives,
 * appliquer un avertissement ou une suspension.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Loader,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AuditStatus = 'sent' | 'responded' | 'reviewed' | 'agence_warned' | 'agence_suspended'
type Feedback = 'correct' | 'intrusive' | 'not_contacted' | 'interested' | 'complaint'

interface Audit {
  id: string
  agence_id: string
  assignment_id: string
  prospect_id: number
  audit_month: string
  contact_email: string | null
  email_sent_at: string | null
  response_at: string | null
  feedback: Feedback | null
  feedback_message: string | null
  status: AuditStatus
  reviewed_at: string | null
  created_at: string
  agence?: { raison_sociale: string } | null
}

const STATUS_LABELS: Record<AuditStatus, string> = {
  sent: 'Email envoyé',
  responded: 'Réponse reçue',
  reviewed: 'Vérifié BRH',
  agence_warned: 'Agence avertie',
  agence_suspended: 'Agence suspendue',
}

const STATUS_COLORS: Record<AuditStatus, string> = {
  sent: 'bg-blue-100 text-blue-800',
  responded: 'bg-purple-100 text-purple-800',
  reviewed: 'bg-emerald-100 text-emerald-800',
  agence_warned: 'bg-amber-100 text-amber-800',
  agence_suspended: 'bg-red-100 text-red-800',
}

const FEEDBACK_LABELS: Record<Feedback, string> = {
  correct: '✅ Contact correct',
  intrusive: '⚠ Intrusif',
  not_contacted: '❓ Non contacté',
  interested: 'Intéressé',
  complaint: '🚫 Plainte',
}

const FEEDBACK_BADGE: Record<Feedback, string> = {
  correct: 'bg-emerald-100 text-emerald-800',
  intrusive: 'bg-amber-100 text-amber-800',
  not_contacted: 'bg-gray-100 text-gray-700',
  interested: 'bg-purple-100 text-purple-800',
  complaint: 'bg-red-100 text-red-800',
}

export default function AdminAgenceAudits() {
  const qc = useQueryClient()
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<AuditStatus | ''>('')
  const [filterFeedback, setFilterFeedback] = useState<Feedback | ''>('')

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['admin-audits', filterMonth, filterStatus, filterFeedback] as const,
    queryFn: async () => {
      let q = supabase
        .from('brh_agence_audits')
        .select('*, agence:brh_agences_immo!brh_agence_audits_agence_id_fkey(raison_sociale)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (filterMonth) q = q.eq('audit_month', filterMonth)
      if (filterStatus) q = q.eq('status', filterStatus)
      if (filterFeedback) q = q.eq('feedback', filterFeedback)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Audit[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AuditStatus }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('brh_agence_audits')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-audits'] }),
  })

  // Trigger manuel : génère les audits du mois précédent
  const generateNow = useMutation({
    mutationFn: async () => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const { data, error } = await supabase.rpc('brh_generate_monthly_audits', {
        p_audit_month: monthStr,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-audits'] }),
  })

  // Stats agrégées
  const complaints = audits.filter((a) => a.feedback === 'complaint').length
  const intrusive = audits.filter((a) => a.feedback === 'intrusive').length

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <ShieldAlert className="text-primary" size={24} />
            Audits aléatoires agences
          </h1>
          <p className="text-sm text-gray-600">
            5 % des leads contactés audités mensuellement · 3 plaintes confirmées = suspension
          </p>
        </div>
        <button
          onClick={() => generateNow.mutate()}
          disabled={generateNow.isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={generateNow.isPending ? 'animate-spin' : ''} size={14} />
          Générer audits du mois précédent
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi label="Total affichés" value={audits.length} />
        <Kpi label="⚠ Intrusifs" value={intrusive} alert={intrusive > 0} />
        <Kpi label="🚫 Plaintes" value={complaints} alert={complaints > 0} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={18} className="text-gray-400" />
        <input
          type="month"
          value={filterMonth ? filterMonth.slice(0, 7) : ''}
          onChange={(e) => setFilterMonth(e.target.value ? `${e.target.value}-01` : '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AuditStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterFeedback}
          onChange={(e) => setFilterFeedback(e.target.value as Feedback | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous feedbacks</option>
          {Object.entries(FEEDBACK_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-emerald-50 rounded-2xl p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={32} />
          <p className="text-emerald-900 font-medium">Aucun audit pour ces filtres.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr className="text-left">
                <th className="px-4 py-3">Mois</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3">Prospect</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {audits.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">
                    {new Date(a.audit_month).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">
                    {a.agence?.raison_sociale ?? `#${a.agence_id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">#{a.prospect_id}</td>
                  <td className="px-4 py-3">
                    {a.feedback ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${FEEDBACK_BADGE[a.feedback]}`}>
                        {FEEDBACK_LABELS[a.feedback]}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs italic text-gray-600 max-w-xs truncate">
                    {a.feedback_message ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'responded' || a.status === 'sent' ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => updateStatus.mutate({ id: a.id, status: 'reviewed' })}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded"
                          title="Marquer vérifié OK"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        {(a.feedback === 'intrusive' || a.feedback === 'complaint') && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: a.id, status: 'agence_warned' })}
                              className="p-1.5 hover:bg-amber-50 text-amber-700 rounded"
                              title="Avertir l'agence"
                            >
                              <AlertTriangle size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Suspendre cette agence (${a.agence?.raison_sociale}) ?`)) {
                                  updateStatus.mutate({ id: a.id, status: 'agence_suspended' })
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                              title="Suspendre l'agence"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        alert && value > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  )
}
