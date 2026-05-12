/**
 * AdminQuotas — Gestion granulaire des quotas par profil (Phase Admin V1).
 *
 * Audit-ux-2026-05-12 point #5 : permettre à l'admin de définir un quota custom
 * (leads/sem ou /mois) sur chaque agence / artisan / employé, indépendamment
 * du tier ou de l'activity_level. Affiche aussi les warnings ouverts (profils
 * dormants, overrides récents).
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sliders,
  Building2,
  Wrench,
  UserCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react'
import {
  adminQuotasApi,
  type ProfileWithQuota,
  type QuotaPeriod,
  type QuotaTarget,
} from '@/api/admin-quotas'

const EMPLOYE_TIER_QUOTA: Record<string, number | null> = {
  standard: 5,
  pro: 15,
  expert: 35,
  master: null, // illimité
}

const TARGET_TABS: Array<{ id: QuotaTarget; label: string; Icon: typeof Building2 }> = [
  { id: 'agence', label: 'Agences immo', Icon: Building2 },
  { id: 'artisan', label: 'Artisans RGE', Icon: Wrench },
  { id: 'employe', label: 'Employés BRH', Icon: UserCircle },
]

export default function AdminQuotas() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<QuotaTarget>('agence')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftQuota, setDraftQuota] = useState<string>('')
  const [draftPeriod, setDraftPeriod] = useState<QuotaPeriod>('monthly')

  const profilesQuery = useQuery({
    queryKey: ['admin-quotas', activeTab],
    queryFn: () =>
      activeTab === 'agence'
        ? adminQuotasApi.listAgences()
        : activeTab === 'artisan'
        ? adminQuotasApi.listArtisans()
        : adminQuotasApi.listEmployes(),
    staleTime: 30_000,
  })

  const warningsQuery = useQuery({
    queryKey: ['admin-warnings'],
    queryFn: () => adminQuotasApi.listWarnings(false),
    staleTime: 60_000,
  })

  const setQuotaMut = useMutation({
    mutationFn: adminQuotasApi.setCustomQuota,
    onSuccess: () => {
      toast.success('Quota mis à jour')
      qc.invalidateQueries({ queryKey: ['admin-quotas'] })
      qc.invalidateQueries({ queryKey: ['admin-warnings'] })
      setEditingId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const detectDormantMut = useMutation({
    mutationFn: () => adminQuotasApi.detectDormant(60),
    onSuccess: (count) => {
      toast.success(`${count} profil(s) dormant(s) détecté(s)`)
      qc.invalidateQueries({ queryKey: ['admin-warnings'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resolveMut = useMutation({
    mutationFn: (id: string) => adminQuotasApi.resolveWarning(id),
    onSuccess: () => {
      toast.success('Avertissement marqué résolu')
      qc.invalidateQueries({ queryKey: ['admin-warnings'] })
    },
  })

  const profiles = profilesQuery.data ?? []
  const warnings = warningsQuery.data ?? []
  const filteredProfiles = profiles.filter((p) =>
    !search ? true : p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
  )

  function effectiveQuota(p: ProfileWithQuota): { value: number | null; source: 'custom' | 'tier' | 'level' | 'none' } {
    if (p.custom_quota !== null) return { value: p.custom_quota, source: 'custom' }
    if (p.target_type === 'agence' && p.tier_quota !== null) return { value: p.tier_quota, source: 'tier' }
    if (p.target_type === 'employe' && p.tier) {
      return { value: EMPLOYE_TIER_QUOTA[p.tier] ?? null, source: 'level' }
    }
    return { value: null, source: 'none' }
  }

  function startEdit(p: ProfileWithQuota) {
    setEditingId(p.target_id)
    setDraftQuota(p.custom_quota?.toString() ?? '')
    setDraftPeriod(p.quota_period)
  }

  function saveEdit(p: ProfileWithQuota) {
    const parsed = draftQuota.trim() === '' ? null : Number(draftQuota)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error('Quota invalide')
      return
    }
    setQuotaMut.mutate({
      targetType: p.target_type,
      targetId: p.target_id,
      customQuota: parsed,
      period: draftPeriod,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftQuota('')
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Sliders size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-display text-slate-900">Quotas granulaires</h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Définit le quota custom de chaque profil (override du tier ou de l'activity level).
            Laissez vide pour revenir au défaut. Les modifications sont tracées dans l'audit trail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => detectDormantMut.mutate()}
          disabled={detectDormantMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
        >
          {detectDormantMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Détecter dormants (60j)
        </button>
      </header>

      {/* Warnings panel */}
      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="text-sm font-bold text-amber-900 inline-flex items-center gap-1.5">
            <AlertCircle size={14} />
            Avertissements ouverts ({warnings.length})
          </h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {warnings.slice(0, 20).map((w) => (
              <div
                key={w.id}
                className="flex items-start justify-between gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-amber-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">
                    <span className={`inline-block text-[10px] uppercase font-bold mr-1.5 px-1.5 py-0.5 rounded ${
                      w.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      w.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{w.warning_type}</span>
                    {w.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(w.created_at).toLocaleString('fr-FR')} · {w.target_type} {w.target_id.slice(0, 8)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resolveMut.mutate(w.id)}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 shrink-0"
                >
                  <CheckCircle2 size={12} className="inline mr-0.5" />
                  Traité
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {TARGET_TABS.map((tab) => {
          const Icon = tab.Icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setEditingId(null)
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
      </div>

      {/* Profiles list */}
      {profilesQuery.isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Search size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aucun profil ne correspond</p>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Essayez un autre terme de recherche.' : 'Aucun profil enregistré pour ce type.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Profil</th>
                <th className="px-4 py-3 text-left font-semibold">Tier / Niveau</th>
                <th className="px-4 py-3 text-right font-semibold">Quota effectif</th>
                <th className="px-4 py-3 text-right font-semibold">Usage</th>
                <th className="px-4 py-3 text-right font-semibold">Période</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.map((p) => {
                const isEditing = editingId === p.target_id
                const eff = effectiveQuota(p)
                return (
                  <tr key={p.target_id} className={isEditing ? 'bg-slate-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.display_name}</p>
                      {p.email && <p className="text-[11px] text-slate-500">{p.email}</p>}
                      {!p.is_active && (
                        <span className="inline-block mt-0.5 text-[9px] uppercase font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {p.tier ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={draftQuota}
                          onChange={(e) => setDraftQuota(e.target.value)}
                          placeholder={`tier: ${eff.source === 'custom' ? '—' : eff.value ?? '∞'}`}
                          className="w-24 px-2 py-1 text-right rounded border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      ) : (
                        <span className={`font-bold tabular-nums ${
                          eff.source === 'custom' ? 'text-violet-700' :
                          eff.value === null ? 'text-slate-400' :
                          'text-slate-700'
                        }`}>
                          {eff.value ?? '∞'}
                          {eff.source === 'custom' && (
                            <span className="ml-1 text-[9px] uppercase font-bold text-violet-700">custom</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 tabular-nums">
                      {p.current_usage ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <select
                          value={draftPeriod}
                          onChange={(e) => setDraftPeriod(e.target.value as QuotaPeriod)}
                          className="px-2 py-1 rounded border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="weekly">Semaine</option>
                          <option value="monthly">Mois</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-600">
                          {p.quota_period === 'weekly' ? 'Semaine' : 'Mois'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(p)}
                            disabled={setQuotaMut.isPending}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold disabled:opacity-50"
                          >
                            {setQuotaMut.isPending ? <Loader2 size={11} className="animate-spin" /> : 'OK'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 text-[11px] font-semibold text-slate-600"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 transition"
                        >
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
