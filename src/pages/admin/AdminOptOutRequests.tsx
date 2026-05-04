/**
 * Phase 16.0.4 admin — `/admin/opt-out-requests`.
 *
 * Traitement des demandes RGPD Art. 21 (opposition / suppression / rectification).
 * Deadline légale 30 jours. Affiche un compte à rebours par demande, alerte rouge si dépassement.
 *
 * Actions admin :
 *   - Marquer comme "processing" (en cours)
 *   - Marquer comme "completed" (purge effectuée + email envoyé)
 *   - Marquer comme "rejected" (avec motif, ex: pas trouvé en base)
 *   - Voir le prospect matché si le code postal + commune ont retourné un match
 */
import { useState, useMemo } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader,
  Filter,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type OptOutStatus = 'pending' | 'processing' | 'completed' | 'rejected'
type RequestType = 'opposition' | 'suppression' | 'rectification'

interface OptOutRequest {
  id: string
  email: string
  request_type: RequestType
  adresse: string | null
  code_postal: string | null
  commune: string | null
  message: string | null
  status: OptOutStatus
  matched_prospect_id: number | null
  source_ip: string | null
  created_at: string
  deadline: string
  processed_at: string | null
  processing_notes: string | null
}

const STATUS_LABELS: Record<OptOutStatus, string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Traitée',
  rejected: 'Rejetée',
}

const STATUS_COLORS: Record<OptOutStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

const TYPE_LABELS: Record<RequestType, string> = {
  opposition: 'Opposition',
  suppression: 'Suppression',
  rectification: 'Rectification',
}

export default function AdminOptOutRequests() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<OptOutStatus | ''>('pending')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['optout-requests', filterStatus] as const,
    queryFn: async () => {
      let q = supabase
        .from('brh_optout_requests')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200)
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as OptOutRequest[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string
      status: OptOutStatus
      notes?: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('brh_optout_requests')
        .update({
          status,
          processed_at: status === 'completed' || status === 'rejected' ? new Date().toISOString() : null,
          processed_by: user?.id ?? null,
          processing_notes: notes ?? null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['optout-requests'] }),
  })

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length
    const overdue = requests.filter(
      (r) => r.status !== 'completed' && r.status !== 'rejected' && new Date(r.deadline) < new Date(),
    ).length
    return { pending, overdue, total: requests.length }
  }, [requests])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-display flex items-center gap-2">
          <Shield className="text-primary" size={24} />
          Demandes RGPD opt-out
        </h1>
        <p className="text-sm text-gray-600">
          Art. 21 RGPD · Délai légal de traitement : 30 jours
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="En attente" value={stats.pending} color="amber" />
        <KpiCard label="En retard ⚠" value={stats.overdue} color="red" />
        <KpiCard label="Total affichées" value={stats.total} color="gray" />
      </div>

      {stats.overdue > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold">⚠ {stats.overdue} demande(s) hors délai légal</p>
            <p className="text-xs mt-1">
              Risque CNIL : amende potentielle si un demandeur dépose plainte.
              Traitement prioritaire requis.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
        <Filter size={18} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OptOutStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Toutes</option>
          {(['pending', 'processing', 'completed', 'rejected'] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={32} />
          <p className="text-emerald-900 font-medium">Aucune demande à traiter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const overdue =
              r.status !== 'completed' &&
              r.status !== 'rejected' &&
              new Date(r.deadline) < new Date()
            return (
              <article
                key={r.id}
                className={`bg-white rounded-xl border p-4 space-y-2 ${
                  overdue ? 'border-red-300 bg-red-50/30' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{r.email}</p>
                    <p className="text-xs text-gray-500">
                      Reçue le {new Date(r.created_at).toLocaleString('fr-FR')} ·
                      Deadline : {new Date(r.deadline).toLocaleDateString('fr-FR')}
                      {overdue ? <span className="text-red-600 font-semibold ml-1">⚠ DÉPASSÉE</span> : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                      {TYPE_LABELS[r.request_type]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                </div>

                {(r.adresse || r.commune) && (
                  <p className="text-sm bg-gray-50 rounded px-3 py-2">
                    📍 {r.adresse ? `${r.adresse}, ` : ''}
                    {r.code_postal} {r.commune}
                    {r.matched_prospect_id ? (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Prospect matché #{r.matched_prospect_id}
                      </span>
                    ) : null}
                  </p>
                )}

                {r.message && (
                  <p className="text-sm italic bg-gray-50 rounded px-3 py-2">
                    💬 {r.message}
                  </p>
                )}

                {r.processing_notes && (
                  <p className="text-xs bg-blue-50 rounded px-3 py-2">
                    Note interne : {r.processing_notes}
                  </p>
                )}

                {r.status === 'pending' || r.status === 'processing' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editingId === r.id ? (
                      <div className="flex flex-wrap gap-2 items-center w-full bg-gray-50 p-3 rounded-lg">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Notes (purge effectuée, prospect non trouvé, etc.)"
                          className="flex-1 min-w-[200px] px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={async () => {
                            await updateStatus.mutateAsync({
                              id: r.id,
                              status: 'completed',
                              notes: editNotes || 'Purge effectuée',
                            })
                            setEditingId(null)
                            setEditNotes('')
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Marquer traitée
                        </button>
                        <button
                          onClick={async () => {
                            await updateStatus.mutateAsync({
                              id: r.id,
                              status: 'rejected',
                              notes: editNotes || 'Demande non recevable',
                            })
                            setEditingId(null)
                            setEditNotes('')
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 inline-flex items-center gap-1"
                        >
                          <XCircle size={12} /> Rejeter
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditNotes('')
                          }}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <>
                        {r.status === 'pending' ? (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: 'processing' })}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-1"
                          >
                            <Clock size={12} /> Démarrer le traitement
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            setEditingId(r.id)
                            setEditNotes('')
                          }}
                          className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Clôturer
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-semibold mb-1">Workflow recommandé :</p>
        <ol className="list-decimal pl-5 space-y-0.5">
          <li>Vérifier le prospect matché en base (lien {`brh_dpe_prospects.id`})</li>
          <li>Si match : SET opt_out=true sur le prospect + désactiver les leads actifs (UPDATE brh_lead_assignments status='released')</li>
          <li>Notifier les agences ayant claim ce prospect (charge admin manuelle pour MVP, EF future)</li>
          <li>Marquer la demande "traitée" + note brève</li>
        </ol>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'amber' | 'red' | 'gray'
}) {
  const colors = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-300 bg-red-50 text-red-900',
    gray: 'border-gray-200 bg-white text-gray-900',
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${colors[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  )
}
