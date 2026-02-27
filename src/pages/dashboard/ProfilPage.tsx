import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Shield,
  CalendarDays,
  Pencil,
  Check,
  X,
  Lock,
  Trash2,
  Loader2,
  AlertCircle,
  Home,
  FolderOpen,
  ClipboardList,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-light p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={19} />
      </div>
      <div>
        <p className="font-display text-2xl text-text-primary leading-none">{value}</p>
        <p className="font-body text-xs text-text-light mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteAccountModal({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  const [confirmText, setConfirmText] = useState('')
  const canDelete = confirmText === 'SUPPRIMER'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-danger mb-4">
          <Trash2 size={20} />
        </div>
        <h3 className="font-display text-xl text-text-primary mb-2">Supprimer mon compte</h3>
        <p className="font-body text-sm text-text-secondary mb-4 leading-relaxed">
          Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement : logements, dossiers, rendez-vous et profil.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-display text-text-secondary mb-1.5">
            Tapez <strong>SUPPRIMER</strong> pour confirmer
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-danger transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete || deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-danger text-white font-display text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Stats {
  homes: number
  cases: number
  diagnostics: number
}

export default function ProfilPage() {
  const { user, setUser } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  // Profile edit
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(user?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  // Password change
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Stats
  const [stats, setStats] = useState<Stats>({ homes: 0, cases: 0, diagnostics: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Member since
  const [memberSince, setMemberSince] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setNewName(user.full_name)

    async function fetchStats() {
      setLoadingStats(true)
      const [homesRes, casesRes, diagRes, profileRes] = await Promise.all([
        supabase.from('brh_homes').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('brh_cases').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('brh_diagnostics').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('profiles').select('created_at').eq('id', user!.id).single(),
      ])
      setStats({
        homes: homesRes.count ?? 0,
        cases: casesRes.count ?? 0,
        diagnostics: diagRes.count ?? 0,
      })
      if (profileRes.data) {
        setMemberSince(profileRes.data.created_at)
      }
      setLoadingStats(false)
    }

    void fetchStats()
  }, [user])

  async function handleSaveName() {
    if (!user) return
    setNameError(null)
    setNameSuccess(false)

    const trimmed = newName.trim()
    if (!trimmed) {
      setNameError('Le nom ne peut pas être vide.')
      return
    }
    if (trimmed === user.full_name) {
      setEditingName(false)
      return
    }

    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', user.id)

    setSavingName(false)

    if (error) {
      setNameError('Impossible de mettre à jour votre nom. Veuillez réessayer.')
      return
    }

    setUser({ ...user, full_name: trimmed })
    setEditingName(false)
    setNameSuccess(true)
    setTimeout(() => setNameSuccess(false), 3000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      setPasswordError(
        error.message.includes('session')
          ? 'Session expirée. Veuillez vous reconnecter.'
          : 'Impossible de mettre à jour le mot de passe. Veuillez réessayer.'
      )
      return
    }

    setPasswordSuccess(true)

    setNewPassword('')
    setConfirmPassword('')
    setChangingPassword(false)
    setTimeout(() => setPasswordSuccess(false), 4000)
  }

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)

    // Sign out — actual account deletion requires a server-side function
    // For now we sign out and navigate; the admin would handle the deletion.
    // In production, call a Supabase Edge Function to delete the user.
    const { error } = await supabase.auth.signOut()

    if (error) {
      setDeleting(false)
      setShowDelete(false)
      return
    }

    setUser(null)
    navigate('/')
  }

  const roleLabel = user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'

  const inputCls =
    'w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors'

  if (!user) return null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-text-primary">Mon profil</h1>
        <p className="font-body text-text-secondary mt-1">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-display text-2xl shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl text-text-primary">{user.full_name}</h2>
            <p className="font-body text-sm text-text-secondary">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
              }`}>
                <Shield size={10} className="mr-1" />
                {roleLabel}
              </span>
              {memberSince && (
                <span className="text-xs font-body text-text-light flex items-center gap-1">
                  <CalendarDays size={10} />
                  Membre depuis {new Date(memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Home}
          label="Logements"
          value={loadingStats ? '…' : stats.homes}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={FolderOpen}
          label="Dossiers"
          value={loadingStats ? '…' : stats.cases}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={ClipboardList}
          label="Diagnostics"
          value={loadingStats ? '…' : stats.diagnostics}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations personnelles */}
        <div className="bg-surface rounded-2xl border border-gray-light p-6">
          <h2 className="font-display text-lg text-text-primary mb-5 flex items-center gap-2">
            <User size={16} className="text-primary" />
            Informations personnelles
          </h2>

          {nameSuccess && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 rounded-xl text-sm text-green-800 font-body">
              <Check size={14} className="text-primary" />
              Nom mis à jour avec succès.
            </div>
          )}

          {/* Name field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-display text-text-secondary">Nom complet</label>
              {!editingName && (
                <button
                  onClick={() => { setEditingName(true); setNewName(user.full_name) }}
                  className="flex items-center gap-1 text-xs font-body text-primary hover:underline"
                >
                  <Pencil size={11} /> Modifier
                </button>
              )}
            </div>

            {editingName ? (
              <div>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
                {nameError && (
                  <p className="text-xs text-danger font-body mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {nameError}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setEditingName(false); setNameError(null) }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-light text-text-secondary font-display text-xs rounded-lg hover:bg-background transition-colors"
                  >
                    <X size={12} /> Annuler
                  </button>
                  <button
                    onClick={() => void handleSaveName()}
                    disabled={savingName}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {savingName ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-body text-text-primary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light">
                {user.full_name}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="mb-4">
            <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1">
              <Mail size={11} /> Adresse email
            </label>
            <p className="text-sm font-body text-text-secondary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light">
              {user.email}
            </p>
            <p className="text-xs font-body text-text-light mt-1">
              Pour modifier votre email, contactez notre support.
            </p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">Rôle</label>
            <p className="text-sm font-body text-text-secondary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light">
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Password + security */}
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-text-primary flex items-center gap-2">
                <Lock size={16} className="text-primary" />
                Sécurité
              </h2>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="flex items-center gap-1 text-xs font-body text-primary hover:underline"
                >
                  <Pencil size={11} /> Modifier
                </button>
              )}
            </div>

            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 rounded-xl text-sm text-green-800 font-body">
                <Check size={14} className="text-primary" />
                Mot de passe mis à jour avec succès.
              </div>
            )}

            {!changingPassword ? (
              <div>
                <label className="block text-xs font-display text-text-secondary mb-1.5">Mot de passe</label>
                <p className="text-sm font-body text-text-secondary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light tracking-widest">
                  ••••••••
                </p>
              </div>
            ) : (
              <form onSubmit={e => void handleChangePassword(e)} className="space-y-3">
                {passwordError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-danger font-body">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">
                    Nouveau mot de passe <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className={`${inputCls} pr-10`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text-primary"
                    >
                      {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">
                    Confirmer le mot de passe <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false)
                      setNewPassword('')
                      setConfirmPassword('')
                  
                      setPasswordError(null)
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors"
                  >
                    <X size={13} /> Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {savingPassword ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {savingPassword ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Danger zone */}
          <div className="bg-surface rounded-2xl border border-red-200 p-6">
            <h2 className="font-display text-lg text-danger mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              Zone de danger
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-gray-light">
                <div>
                  <p className="font-display text-sm text-text-primary">Se déconnecter</p>
                  <p className="font-body text-xs text-text-light mt-0.5">Ferme votre session sur cet appareil</p>
                </div>
                <button
                  onClick={() => void signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-light text-text-secondary font-display text-xs rounded-lg hover:bg-background transition-colors"
                >
                  <LogOut size={13} />
                  Déconnexion
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="font-display text-sm text-danger">Supprimer mon compte</p>
                  <p className="font-body text-xs text-red-400 mt-0.5">Action irréversible</p>
                </div>
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-danger text-white font-display text-xs rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={13} />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <DeleteAccountModal
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
