import { Lock, Pencil, Check, X, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface ProfilSecurityCardProps {
  changingPassword: boolean
  newPassword: string
  confirmPassword: string
  showNewPwd: boolean
  savingPassword: boolean
  passwordError: string | null
  passwordSuccess: boolean
  inputCls: string
  onStartChange: () => void
  onCancel: () => void
  onNewPasswordChange: (val: string) => void
  onConfirmPasswordChange: (val: string) => void
  onToggleShowPwd: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function ProfilSecurityCard({
  changingPassword,
  newPassword,
  confirmPassword,
  showNewPwd,
  savingPassword,
  passwordError,
  passwordSuccess,
  inputCls,
  onStartChange,
  onCancel,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPwd,
  onSubmit,
}: ProfilSecurityCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-light p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg text-text-primary flex items-center gap-2">
          <Lock size={16} className="text-primary" />
          Sécurité
        </h2>
        {!changingPassword && (
          <button
            onClick={onStartChange}
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
        <form onSubmit={e => void onSubmit(e)} className="space-y-3">
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
                onChange={e => onNewPasswordChange(e.target.value)}
                placeholder="8 caractères minimum"
                className={`${inputCls} pr-10`}
                autoFocus
              />
              <button
                type="button"
                onClick={onToggleShowPwd}
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
              onChange={e => onConfirmPasswordChange(e.target.value)}
              placeholder="Répétez le mot de passe"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
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
  )
}
