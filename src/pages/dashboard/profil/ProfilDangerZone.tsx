import { AlertCircle, LogOut, Trash2 } from 'lucide-react'

interface ProfilDangerZoneProps {
  onSignOut: () => void
  onShowDelete: () => void
}

export function ProfilDangerZone({ onSignOut, onShowDelete }: ProfilDangerZoneProps) {
  return (
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
            onClick={onSignOut}
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
            onClick={onShowDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-danger text-white font-display text-xs rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
