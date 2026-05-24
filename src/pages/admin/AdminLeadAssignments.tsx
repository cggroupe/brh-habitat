/**
 * Phase 16.0.5 admin — `/admin/lead-assignments`.
 *
 * Supervision globale des claims de leads inter-agences. Permet de :
 *   - Voir qui claim quoi en temps réel
 *   - Identifier les agences abusives (beaucoup de blacklisted)
 *   - Libérer manuellement des leads bloqués (override RLS)
 *   - Trigger release des expired (helper SQL)
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Loader,
  Filter,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AssignmentStatus, ContactOutcome } from '@/api/lead-assignments'

interface AdminAssignment {
  id: string
  prospect_id: number
  agence_id: string
  status: AssignmentStatus
  contact_attempts: number
  last_attempt_at: string | null
  last_attempt_outcome: ContactOutcome | null
  notes: string | null
  claimed_at: string
  expires_at: string
  agence?: { raison_sociale: string; status: string } | null
}

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'Active',
  contacted: 'Contactée',
  expired: 'Expirée',
  released: 'Libérée',
  blacklisted: 'Blacklistée',
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  active: 'bg-blue-100 text-blue-800',
  contacted: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-700',
  released: 'bg-gray-100 text-gray-700',
  blacklisted: 'bg-red-100 text-red-800',
}

export default function AdminLeadAssignments() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<AssignmentStatus | ''>('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-lead-assignments', filterStatus] as const,
    queryFn: async () => {
      let q = supabase
        .from('brh_lead_assignments')
        .select(
          '*, agence:brh_agences_immo!brh_lead_assignments_agence_id_fkey(raison_sociale, status)',
        )
        .order('claimed_at', { ascending: false })
        .limit(300)
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as AdminAssignment[]
    },
  })

  const releaseMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brh_lead_assignments')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lead-assignments'] }),
  })

  const releaseExpiredMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('brh_release_expired_assignments')
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lead-assignments'] }),
  })

  // Stats par agence (top "abusives" = blacklisted ratio élevé)
  const abusiveAgencies = useMemo(() => {
    const byAgence = new Map<
      string,
      { name: string; total: number; blacklisted: number }
    >()
    for (const a of rows) {
      const key = a.agence_id
      const cur = byAgence.get(key) ?? {
        name: a.agence?.raison_sociale ?? key.slice(0, 8),
        total: 0,
        blacklisted: 0,
      }
      cur.total++
      if (a.status === 'blacklisted') cur.blacklisted++
      byAgence.set(key, cur)
    }
    return Array.from(byAgence.entries())
      .map(([id, s]) => ({ id, ...s, ratio: s.total > 0 ? s.blacklisted / s.total : 0 }))
      .filter((s) => s.blacklisted > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5)
  }, [rows])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <ClipboardList className="text-primary" size={24} />
            Supervision claims agences
          </h1>
          <p className="text-sm text-gray-600">
            Anti-doublon · exclusivité 30j · frequency cap 2 tentatives
          </p>
        </div>
        <button
          onClick={() => releaseExpiredMut.mutate()}
          disabled={releaseExpiredMut.isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
        >
          <RefreshCw className={releaseExpiredMut.isPending ? 'animate-spin' : ''} size={14} />
          Release expired (cron manuel)
        </button>
      </header>

      {abusiveAgencies.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
          <p className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={16} /> Agences avec leads blacklistés
          </p>
          <div className="mt-2 space-y-1">
            {abusiveAgencies.map((s) => (
              <div key={s.id} className="text-sm flex items-center justify-between">
                <span>{s.name}</span>
                <span className="text-xs text-amber-800">
                  {s.blacklisted} / {s.total} leads ({Math.round(s.ratio * 100)} %)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
        <Filter size={18} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AssignmentStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 ml-auto">{rows.length} assignments</p>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-500">
          Aucun assignment trouvé.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr className="text-left">
                <th className="px-4 py-3">Prospect</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Tentatives</th>
                <th className="px-4 py-3">Claim le</th>
                <th className="px-4 py-3">Expire le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono">#{r.prospect_id}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium">
                      {r.agence?.raison_sociale ?? r.agence_id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.contact_attempts} / 2
                    {r.last_attempt_outcome ? (
                      <p className="text-gray-500 italic">{r.last_attempt_outcome}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.claimed_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.expires_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(r.status === 'active' || r.status === 'blacklisted') && (
                      <button
                        onClick={() => {
                          if (confirm('Libérer ce lead manuellement ?')) {
                            releaseMut.mutate(r.id)
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                        title="Libérer (override admin)"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
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
