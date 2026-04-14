import { Home, MapPin, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react'

interface LogementHeaderProps {
  address: string
  postalCode: string
  city: string
  editing: boolean
  saving: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onSave: () => void
  onShowDelete: () => void
}

export function LogementHeader({
  address,
  postalCode,
  city,
  editing,
  saving,
  onStartEditing,
  onCancelEditing,
  onSave,
  onShowDelete,
}: LogementHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <Home size={22} />
        </div>
        <div>
          <h1 className="font-display text-3xl text-text-primary leading-tight">
            {address}
          </h1>
          <p className="font-body text-text-secondary mt-1 flex items-center gap-1.5">
            <MapPin size={13} />
            {postalCode} {city}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!editing ? (
          <>
            <button
              onClick={onStartEditing}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil size={14} />
              Modifier
            </button>
            <button
              onClick={onShowDelete}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-danger font-display text-sm rounded-xl hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancelEditing}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors"
            >
              <X size={14} />
              Annuler
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
