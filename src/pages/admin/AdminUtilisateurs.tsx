import { useEffect, useState, useCallback } from 'react'
import { Users, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import type { ProfileRow, UserRole } from '@/types/database'

interface ProfileWithCounts extends ProfileRow {
  homes_count: number
  cases_count: number
  diagnostics_count: number
}

const PAGE_SIZE = 20

export default function AdminUtilisateurs() {
  const { user: currentUser } = useAppStore()
  const [profiles, setProfiles] = useState<ProfileWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const [savingRoleId, setSavingRoleId] = useState<string | null>(null)
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null)
  const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, count, error: fetchError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (fetchError) {
      setError('Erreur lors du chargement des utilisateurs.')
      setLoading(false)
      return
    }

    const rows = data ?? []

    // Fetch counts for each user in parallel
    const userIds = rows.map((p) => p.id)

    const [homesResult, casesResult, diagnosticsResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from('brh_homes').select('user_id').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from('brh_cases').select('user_id').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from('brh_diagnostics').select('user_id').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    const homesCountMap: Record<string, number> = {}
    const casesCountMap: Record<string, number> = {}
    const diagnosticsCountMap: Record<string, number> = {}

    ;(homesResult.data ?? []).forEach((h) => {
      homesCountMap[h.user_id] = (homesCountMap[h.user_id] ?? 0) + 1
    })
    ;(casesResult.data ?? []).forEach((c) => {
      casesCountMap[c.user_id] = (casesCountMap[c.user_id] ?? 0) + 1
    })
    ;(diagnosticsResult.data ?? []).forEach((d) => {
      if (d.user_id) {
        diagnosticsCountMap[d.user_id] = (diagnosticsCountMap[d.user_id] ?? 0) + 1
      }
    })

    const enriched: ProfileWithCounts[] = rows.map((p) => ({
      ...p,
      homes_count: homesCountMap[p.id] ?? 0,
      cases_count: casesCountMap[p.id] ?? 0,
      diagnostics_count: diagnosticsCountMap[p.id] ?? 0,
    }))

    setProfiles(enriched)
    setTotal(count ?? 0)

    // Initialize local roles (preserve dirty states)
    setLocalRoles((prev) => {
      const next = { ...prev }
      enriched.forEach((p) => {
        if (!(p.id in next)) next[p.id] = p.role
      })
      return next
    })

    setLoading(false)
  }, [page])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  async function saveRole(profile: ProfileWithCounts) {
    const newRole = localRoles[profile.id]
    if (!newRole || newRole === profile.role) return

    // Prevent removing own admin role
    if (currentUser?.id === profile.id) {
      setLocalRoles((prev) => ({ ...prev, [profile.id]: profile.role }))
      return
    }

    setSavingRoleId(profile.id)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (!updateError) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profile.id ? { ...p, role: newRole } : p)
      )
      setSavedRoleId(profile.id)
      setTimeout(() => setSavedRoleId(null), 2500)
    }

    setSavingRoleId(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-text-primary">Utilisateurs</h1>
        <p className="font-body text-sm text-text-light mt-1">
          {total} compte{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-light">
                  <tr>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Logements</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Dossiers</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Diagnostics</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Inscription</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const isCurrentUser = currentUser?.id === profile.id
                    const currentRole = localRoles[profile.id] ?? profile.role
                    const isDirty = currentRole !== profile.role
                    const isExpanded = expandedId === profile.id

                    return (
                      <>
                        <tr
                          key={profile.id}
                          className={`border-b border-gray-light transition-colors ${isDirty ? 'bg-amber-50' : 'hover:bg-background'} ${isExpanded ? '' : 'last:border-0'}`}
                        >
                          {/* User info */}
                          <td className="px-6 py-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                              className="flex items-center gap-3 text-left"
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-display text-sm shrink-0 ${
                                profile.role === 'admin' ? 'bg-red-500' : 'bg-primary'
                              }`}>
                                {profile.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-body text-sm text-text-primary font-medium flex items-center gap-1.5">
                                  {profile.full_name}
                                  {isCurrentUser && (
                                    <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded font-display">
                                      Vous
                                    </span>
                                  )}
                                </p>
                                <p className="font-body text-xs text-text-light">{profile.email}</p>
                              </div>
                            </button>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={currentRole}
                                onChange={(e) => {
                                  if (!isCurrentUser) {
                                    setLocalRoles((prev) => ({ ...prev, [profile.id]: e.target.value as UserRole }))
                                  }
                                }}
                                disabled={isCurrentUser || savingRoleId === profile.id}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-display border outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
                                  currentRole === 'admin'
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                }`}
                              >
                                <option value="user">Utilisateur</option>
                                <option value="admin">Administrateur</option>
                              </select>
                            </div>
                          </td>

                          {/* Counts */}
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 font-body text-sm ${profile.homes_count > 0 ? 'text-text-primary' : 'text-text-light'}`}>
                              {profile.homes_count}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 font-body text-sm ${profile.cases_count > 0 ? 'text-text-primary' : 'text-text-light'}`}>
                              {profile.cases_count}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 font-body text-sm ${profile.diagnostics_count > 0 ? 'text-text-primary' : 'text-text-light'}`}>
                              {profile.diagnostics_count}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                            {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                          </td>

                          {/* Save action */}
                          <td className="px-6 py-3">
                            {isCurrentUser ? (
                              <div className="flex items-center gap-1 text-xs text-text-light font-body">
                                <ShieldCheck size={13} /> Protégé
                              </div>
                            ) : savedRoleId === profile.id ? (
                              <CheckCircle2 size={16} className="text-success" />
                            ) : (
                              <button
                                onClick={() => void saveRole(profile)}
                                disabled={!isDirty || savingRoleId === profile.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              >
                                {savingRoleId === profile.id ? '...' : 'Sauver rôle'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr key={`${profile.id}-expanded`} className="border-b border-gray-light last:border-0">
                            <td colSpan={7} className="px-6 py-4 bg-background">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-surface rounded-xl border border-gray-light p-4 text-center">
                                  <p className="font-display text-2xl text-primary">{profile.homes_count}</p>
                                  <p className="font-body text-xs text-text-light mt-1">Logement{profile.homes_count !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="bg-surface rounded-xl border border-gray-light p-4 text-center">
                                  <p className="font-display text-2xl text-orange-500">{profile.cases_count}</p>
                                  <p className="font-body text-xs text-text-light mt-1">Dossier{profile.cases_count !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="bg-surface rounded-xl border border-gray-light p-4 text-center">
                                  <p className="font-display text-2xl text-blue-500">{profile.diagnostics_count}</p>
                                  <p className="font-body text-xs text-text-light mt-1">Diagnostic{profile.diagnostics_count !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="bg-surface rounded-xl border border-gray-light p-4">
                                  <p className="font-display text-xs text-text-light uppercase tracking-wider mb-1">ID utilisateur</p>
                                  <p className="font-body text-xs text-text-secondary font-mono break-all">{profile.id}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-light">
                <p className="font-body text-sm text-text-light">
                  Page {page + 1} sur {totalPages} — {total} résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
