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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Organisation</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
            Mon equipe
          </h1>
        </div>
        <button
          onClick={() => { setShowModal(true); setInviteError(null) }}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <UserPlus size={14} />
          Inviter
        </button>
      </div>

      {/* Members card */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-text-light/30" />
            </div>
            <p className="text-text-light text-sm font-medium">Aucun membre dans l'equipe.</p>
          </div>
        )}

        {!isLoading && members && members.length > 0 && (
          <ul>
            {members.map((member, idx) => {
              const isCurrentUser = member.profile_id === user?.id
              const isOwner = member.member_role === 'owner'
              const initials = getInitials(member.profile?.full_name ?? '?')

              return (
                <li
                  key={member.id}
                  className={`flex items-center justify-between px-6 py-5 hover:bg-background/50 transition-colors ${idx > 0 ? 'border-t border-background' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center shrink-0">
                      <span className="font-display text-sm font-bold text-primary">{initials}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {member.profile?.full_name ?? '—'}
                        </p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isOwner
                            ? 'bg-primary/10 text-primary'
                            : 'bg-background text-text-light'
                        }`}>
                          {isOwner ? 'Proprietaire' : 'Membre'}
                        </span>
                      </div>
                      <p className="text-xs text-text-light mt-0.5">{member.profile?.email ?? ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-xs text-text-light hidden sm:block">
                      Depuis le {member.joined_at ? new Date(member.joined_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                    {!isCurrentUser && !isOwner && (
                      confirmRemoveId === member.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemove(member.id)}
                            disabled={removeMember.isPending}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase tracking-wide"
                          >
                            {removeMember.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-3 py-1.5 bg-background text-text-light text-xs font-bold rounded-xl hover:text-text-primary transition-colors uppercase tracking-wide"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(member.id)}
                          className="p-2 text-text-light/40 hover:text-red-400 transition-colors rounded-xl hover:bg-red-50"
                          title="Retirer le membre"
                        >
                          <X size={15} />
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(27,28,28,0.15)] w-full max-w-md p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Equipe</p>
                <h2 className="font-display text-xl font-bold tracking-wide text-text-primary uppercase">
                  Inviter un membre
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-text-light hover:text-text-primary transition-colors rounded-xl hover:bg-background"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  Adresse email du compte professionnel
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null) }}
                  placeholder="collaborateur@entreprise.fr"
                  className="w-full px-4 py-3 rounded-xl border border-background hover:border-text-light/30 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
                  required
                />
                <p className="mt-1.5 text-xs text-text-light">
                  L'utilisateur doit deja avoir un compte BRH de type professionnel.
                </p>
              </div>

              {inviteError && (
                <div className="flex items-start gap-2.5 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={inviteMember.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {inviteMember.isPending && <Loader2 size={14} className="animate-spin" />}
                  Envoyer l'invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 bg-background text-text-light font-bold text-xs rounded-xl uppercase tracking-widest hover:text-text-primary transition-colors"
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
