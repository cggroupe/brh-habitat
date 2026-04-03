import { useState } from 'react'
import { Users, UserPlus, X, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCompanyMembers, useInviteMember, useRemoveMember } from '@/hooks/queries'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ProEquipe() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)
  const { data: members, isLoading } = useCompanyMembers(company?.id)
  const inviteMember = useInviteMember()
  const removeMember = useRemoveMember()

  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!company || !inviteEmail.trim()) return
    setInviteError(null)

    try {
      await inviteMember.mutateAsync({ companyId: company.id, email: inviteEmail.trim() })
      setInviteEmail('')
      setShowModal(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erreur lors de l\'invitation')
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember.mutateAsync(memberId)
      setConfirmRemoveId(null)
    } catch {
      // silently fail — unlikely
    }
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mon equipe
          </h1>
        </div>
        <button
          onClick={() => { setShowModal(true); setInviteError(null) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
        >
          <UserPlus size={16} />
          Inviter
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center">
            <p className="font-body text-slate-400">Chargement...</p>
          </div>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div className="p-8 text-center">
            <Users size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-body text-slate-400 text-sm">Aucun membre dans l'equipe.</p>
          </div>
        )}

        {!isLoading && members && members.length > 0 && (
          <ul className="divide-y divide-slate-50">
            {members.map((member) => {
              const isCurrentUser = member.profile_id === user?.id
              const isOwner = member.member_role === 'owner'
              const initials = getInitials(member.profile?.full_name ?? '?')

              return (
                <li key={member.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-display text-sm text-primary">{initials}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm text-slate-800">
                          {member.profile?.full_name ?? '—'}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-body ${
                          isOwner ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isOwner ? 'Proprietaire' : 'Membre'}
                        </span>
                      </div>
                      <p className="font-body text-xs text-slate-400">{member.profile?.email ?? ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="font-body text-xs text-slate-400 hidden sm:block">
                      Depuis le {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                    </p>
                    {!isCurrentUser && !isOwner && (
                      confirmRemoveId === member.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemove(member.id)}
                            disabled={removeMember.isPending}
                            className="px-2 py-1 bg-red-500 text-white font-body text-xs rounded-lg hover:bg-red-600 disabled:opacity-60 transition-colors"
                          >
                            {removeMember.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1 border border-slate-200 text-slate-500 font-body text-xs rounded-lg hover:border-slate-300 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(member.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                          title="Retirer le membre"
                        >
                          <X size={16} />
                        </button>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg uppercase tracking-wide text-slate-900">
                Inviter un membre
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block font-body text-xs text-slate-500 mb-1">
                  Adresse email du compte professionnel
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null) }}
                  placeholder="collaborateur@entreprise.fr"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 font-body text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  required
                />
                <p className="mt-1 font-body text-xs text-slate-400">
                  L'utilisateur doit deja avoir un compte BRH de type professionnel.
                </p>
              </div>

              {inviteError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="font-body text-xs text-red-600">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={inviteMember.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors uppercase tracking-wide"
                >
                  {inviteMember.isPending && <Loader2 size={15} className="animate-spin" />}
                  Envoyer l'invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-display text-sm rounded-lg hover:border-slate-300 transition-colors uppercase tracking-wide"
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
