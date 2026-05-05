/**
 * Phase 16.1 admin — `/admin/agence-social-posts`.
 *
 * Validation des publications réseaux sociaux soumises par les agences
 * partenaires. À la validation (status → 'validee'), le trigger SQL
 * `brh_agence_social_reward_trigger` crédite automatiquement
 * reward_leads dans brh_agence_progression.bonus_leads_unlocked.
 *
 * Actions admin :
 *   - Filtrer par status (en_attente / validee / refusee)
 *   - Cliquer URL pour vérifier la publication réelle
 *   - Valider → +leads bonus crédités auto
 *   - Refuser avec motif
 */
import { useState, useMemo } from 'react'
import {
  Share2,
  CheckCircle2,
  XCircle,
  Loader,
  Filter,
  ExternalLink,
  Award,
  AlertCircle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type SocialStatus =
  | 'en_attente'
  | 'en_cours_verification'
  | 'validee'
  | 'refusee'
  | 'expiree'

interface SocialPostAdminRow {
  id: string
  agence_id: string
  platform: string
  post_type: string
  post_url: string
  description: string | null
  reward_leads: number
  rewarded_at: string | null
  status: SocialStatus
  rejection_reason: string | null
  validated_at: string | null
  created_at: string
  agence?: { id: string; raison_sociale: string | null; commune: string | null } | null
}

const STATUS_LABELS: Record<SocialStatus, string> = {
  en_attente: 'En attente',
  en_cours_verification: 'En cours de vérification',
  validee: 'Validée ✓',
  refusee: 'Refusée',
  expiree: 'Expirée',
}

const STATUS_COLORS: Record<SocialStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-800 border border-amber-200',
  en_cours_verification: 'bg-blue-100 text-blue-800 border border-blue-200',
  validee: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  refusee: 'bg-red-100 text-red-800 border border-red-200',
  expiree: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  google_business: 'Google Business',
}

export default function AdminAgenceSocialPosts() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<SocialStatus | ''>('en_attente')
  const [rejectModal, setRejectModal] = useState<SocialPostAdminRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-agence-social-posts', filterStatus] as const,
    queryFn: async () => {
      let q = supabase
        .from('brh_agence_social_posts')
        .select(
          'id, agence_id, platform, post_type, post_url, description, reward_leads, rewarded_at, status, rejection_reason, validated_at, created_at, agence:brh_agences_immo(id, raison_sociale, commune)',
        )
        .order('created_at', { ascending: false })
        .limit(200)
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as SocialPostAdminRow[]
    },
    staleTime: 30_000,
  })

  const validateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brh_agence_social_posts')
        .update({ status: 'validee', validated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agence-social-posts'] })
      qc.invalidateQueries({ queryKey: ['agence-social'] })
      qc.invalidateQueries({ queryKey: ['agence-contributions'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('brh_agence_social_posts')
        .update({ status: 'refusee', rejection_reason: reason })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agence-social-posts'] })
      setRejectModal(null)
      setRejectReason('')
    },
  })

  const stats = useMemo(() => {
    return {
      total: posts.length,
      attente: posts.filter((p) => p.status === 'en_attente').length,
      validee: posts.filter((p) => p.status === 'validee').length,
      refusee: posts.filter((p) => p.status === 'refusee').length,
      totalLeadsCredited: posts
        .filter((p) => p.status === 'validee')
        .reduce((s, p) => s + p.reward_leads, 0),
    }
  }, [posts])

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
            <Share2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">
              Publications réseaux sociaux agences
            </h1>
            <p className="text-sm text-slate-500">
              Validation des posts soumis par les agences partenaires (récompense en
              leads bonus auto)
            </p>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total" value={stats.total} color="text-slate-700" />
        <KpiCard label="En attente" value={stats.attente} color="text-amber-700" />
        <KpiCard label="Validées" value={stats.validee} color="text-emerald-700" />
        <KpiCard
          label="Leads crédités"
          value={`+${stats.totalLeadsCredited}`}
          color="text-pink-700"
        />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as SocialStatus | '')}
          className="px-3 py-1.5 border border-slate-200 rounded text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="en_attente">En attente</option>
          <option value="en_cours_verification">En cours de vérification</option>
          <option value="validee">Validée</option>
          <option value="refusee">Refusée</option>
        </select>
        <p className="text-xs text-slate-500 ml-auto">
          {posts.length} publication{posts.length > 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-pink-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Share2 size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-700 font-medium">Aucune publication pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-700">
                      {PLATFORM_LABELS[p.platform] ?? p.platform}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {p.post_type}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded">
                      +{p.reward_leads} leads
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {p.agence?.raison_sociale ?? `Agence #${p.agence_id.slice(0, 8)}`}
                    {p.agence?.commune ? <span className="text-slate-500"> · {p.agence.commune}</span> : null}
                  </p>
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 mt-1 truncate max-w-md"
                  >
                    <ExternalLink size={11} />
                    {p.post_url}
                  </a>
                  {p.description ? (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      « {p.description} »
                    </p>
                  ) : null}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Soumis le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    {p.validated_at
                      ? ` · Validé le ${new Date(p.validated_at).toLocaleDateString('fr-FR')}`
                      : ''}
                  </p>
                  {p.rejection_reason ? (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <strong>Refusé :</strong> {p.rejection_reason}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs ${STATUS_COLORS[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </div>

              {p.status === 'en_attente' || p.status === 'en_cours_verification' ? (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => validateMut.mutate(p.id)}
                    disabled={validateMut.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    Valider (+{p.reward_leads} leads auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectModal(p)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-700 text-sm font-bold rounded-lg hover:bg-red-50"
                  >
                    <XCircle size={14} />
                    Refuser
                  </button>
                </div>
              ) : p.status === 'validee' ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded p-2 border border-emerald-200">
                  <Award size={12} />
                  +{p.reward_leads} leads bonus crédités à l'agence le{' '}
                  {p.rewarded_at ? new Date(p.rewarded_at).toLocaleDateString('fr-FR') : '—'}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal refus */}
      {rejectModal ? (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="text-red-500 shrink-0" size={24} />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Refuser la publication</h2>
                <p className="text-xs text-slate-500">
                  L'agence sera notifiée et aucun lead bonus ne sera crédité.
                </p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motif du refus *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Ex : publication ne mentionne pas BRH Habitat / compte privé / lien invalide..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null)
                  setRejectReason('')
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectMut.isPending}
                onClick={() =>
                  rejectMut.mutate({
                    id: rejectModal.id,
                    reason: rejectReason.trim(),
                  })
                }
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMut.isPending ? 'Refus…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
      <p className={`text-3xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  )
}
