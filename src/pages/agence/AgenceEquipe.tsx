/**
 * Phase 16.1 — /agence/equipe : équipe agence + permissions JSONB.
 *
 * Le signataire de la charte peut :
 *   - inviter un employé (par email d'un compte BRH existant)
 *   - régler ses permissions (toggles)
 *   - le retirer de l'équipe
 *
 * Pattern miroir de ProEquipe (Pro). Permissions définies dans
 * `src/types/agence-permissions.ts`.
 */
import { useMemo, useState } from 'react'
import {
  Users,
  UserPlus,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Mail,
  Settings2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useAgenceMembers,
  useInviteAgenceEmployee,
  useRemoveAgenceMember,
  useSetAgenceMemberPermissions,
} from '@/hooks/queries/agence-members'
import {
  AGENCE_PERMISSION_DEFS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  type AgenceMemberPermissions,
  type AgencePermission,
} from '@/types/agence-permissions'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AgenceEquipe() {
  const { user } = useAuth()
  const { data: membership } = useMyAgenceMembership()
  const agenceId = membership?.agenceId
  const isSigner = !!membership

  const { data: members = [], isLoading } = useAgenceMembers(agenceId)
  const invite = useInviteAgenceEmployee(agenceId)
  const setPerms = useSetAgenceMemberPermissions(agenceId)
  const remove = useRemoveAgenceMember(agenceId)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePerms, setInvitePerms] = useState<AgenceMemberPermissions>(
    DEFAULT_EMPLOYEE_PERMISSIONS,
  )
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingPerms, setEditingPerms] = useState<AgenceMemberPermissions>({})
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const employeesCount = useMemo(
    () => members.filter((m) => m.member_role === 'employee').length,
    [members],
  )

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteError(null)
    try {
      await invite.mutateAsync({
        email: inviteEmail.trim(),
        permissions: invitePerms,
      })
      setInviteEmail('')
      setInvitePerms(DEFAULT_EMPLOYEE_PERMISSIONS)
      setShowInviteModal(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erreur lors de l\'invitation')
    }
  }

  function startEdit(memberId: string, current: AgenceMemberPermissions) {
    setEditingId(memberId)
    setEditingPerms({ ...current })
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      await setPerms.mutateAsync({ memberId: editingId, permissions: editingPerms })
      setEditingId(null)
    } catch {
      // mutation expose isError, on laisse l'UI re-render
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await remove.mutateAsync(memberId)
      setConfirmRemoveId(null)
    } catch {
      // ignore — toast à brancher plus tard
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Mon équipe</h1>
            <p className="text-sm text-slate-500">
              Invitez vos négociateurs et réglez leurs permissions par profil.
            </p>
          </div>
        </div>
        {isSigner && (
          <button
            type="button"
            onClick={() => {
              setShowInviteModal(true)
              setInviteError(null)
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-orange-500 to-red-600 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest shadow-md shadow-orange-500/20 hover:-translate-y-0.5 transition-all"
          >
            <UserPlus size={14} />
            Inviter un employé
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Signataire de la charte
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {members.find((m) => m.member_role === 'signer')?.profile?.full_name ??
              membership?.signerName ??
              '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Employés invités
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
            {employeesCount}
          </p>
        </div>
      </div>

      {/* Liste membres */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-orange-500" />
          </div>
        )}

        {!isLoading && members.length === 0 && (
          <div className="p-12 text-center">
            <Users size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-medium">Aucun membre dans l'équipe.</p>
          </div>
        )}

        {!isLoading && members.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => {
              const isCurrent = m.profile_id === user?.id
              const isMemberSigner = m.member_role === 'signer'
              const editing = editingId === m.id
              const confirming = confirmRemoveId === m.id

              return (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isMemberSigner
                          ? 'bg-gradient-to-br from-orange-100 to-red-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="font-bold text-sm">
                        {getInitials(m.profile?.full_name)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {m.profile?.full_name ?? '—'}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            isMemberSigner
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isMemberSigner ? (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck size={10} />
                              Signataire
                            </span>
                          ) : (
                            'Employé'
                          )}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold tracking-wide text-emerald-700">
                            (vous)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {m.profile?.email ?? '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Depuis le {new Date(m.joined_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSigner && !isMemberSigner && !editing && !confirming && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(m.id, m.permissions)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Régler les permissions"
                          >
                            <Settings2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(m.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Retirer de l'équipe"
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                      {confirming && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRemove(m.id)}
                            disabled={remove.isPending}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-60"
                          >
                            {remove.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              'Confirmer'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Permissions inline (read-only sauf en édition) */}
                  {!isMemberSigner && (
                    <div className="mt-3 pl-[3.75rem]">
                      {editing ? (
                        <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-3 space-y-2">
                          {AGENCE_PERMISSION_DEFS.map((def) => (
                            <label
                              key={def.key}
                              className="flex items-start gap-2.5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editingPerms[def.key] === true}
                                onChange={(e) =>
                                  setEditingPerms((prev) => ({
                                    ...prev,
                                    [def.key]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 w-4 h-4 accent-orange-600"
                              />
                              <span className="text-xs">
                                <span className="font-bold text-slate-800">{def.label}</span>{' '}
                                <span className="text-slate-500">— {def.description}</span>
                              </span>
                            </label>
                          ))}
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={setPerms.isPending}
                              className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 disabled:opacity-60"
                            >
                              {setPerms.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                'Enregistrer'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {AGENCE_PERMISSION_DEFS.map((def) => {
                            const granted = m.permissions[def.key] === true
                            return (
                              <span
                                key={def.key}
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  granted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                }`}
                              >
                                {def.label}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Info bandeau */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">Comment inviter un employé ?</p>
          <p>
            Votre collaborateur doit d'abord se créer un compte BRH (gratuit). Une fois son compte
            créé, entrez son adresse email ci-dessus : il rejoindra immédiatement votre équipe avec
            les permissions choisies. Vous pourrez ajuster ses droits à tout moment.
          </p>
        </div>
      </div>

      {/* Modal invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                  Équipe
                </p>
                <h2 className="font-display text-xl font-bold text-slate-800">
                  Inviter un employé
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Adresse email du collaborateur
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      setInviteError(null)
                    }}
                    placeholder="negociateur@mon-agence.fr"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Doit déjà avoir un compte BRH. L'invitation est immédiate.
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Permissions accordées</p>
                <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                  {AGENCE_PERMISSION_DEFS.map((def) => (
                    <label
                      key={def.key}
                      className="flex items-start gap-2.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={invitePerms[def.key] === true}
                        onChange={(e) =>
                          setInvitePerms((prev) => ({
                            ...prev,
                            [def.key]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 w-4 h-4 accent-orange-600"
                      />
                      <span className="text-xs">
                        <span className="font-bold text-slate-800">{def.label}</span>{' '}
                        <span className="text-slate-500">— {def.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {inviteError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={invite.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs rounded-xl uppercase tracking-widest shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {invite.isPending && <Loader2 size={14} className="animate-spin" />}
                  Envoyer l'invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-5 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-200"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
