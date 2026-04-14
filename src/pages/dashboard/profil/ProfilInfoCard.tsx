import { User, Mail, Pencil, Check, X, AlertCircle, Loader2 } from 'lucide-react'

interface ProfilInfoCardProps {
  fullName: string
  email: string
  roleLabel: string
  editingName: boolean
  newName: string
  nameError: string | null
  nameSuccess: boolean
  saving: boolean
  inputCls: string
  onEditStart: () => void
  onEditCancel: () => void
  onNameChange: (val: string) => void
  onSave: () => void
}

export function ProfilInfoCard({
  fullName,
  email,
  roleLabel,
  editingName,
  newName,
  nameError,
  nameSuccess,
  saving,
  inputCls,
  onEditStart,
  onEditCancel,
  onNameChange,
  onSave,
}: ProfilInfoCardProps) {
  return (
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
              onClick={onEditStart}
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
              onChange={e => onNameChange(e.target.value)}
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
                onClick={onEditCancel}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-light text-text-secondary font-display text-xs rounded-lg hover:bg-background transition-colors"
              >
                <X size={12} /> Annuler
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-body text-text-primary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light">
            {fullName}
          </p>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="mb-4">
        <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1">
          <Mail size={11} /> Adresse email
        </label>
        <p className="text-sm font-body text-text-secondary px-3.5 py-2.5 bg-background rounded-xl border border-gray-light">
          {email}
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
  )
}
