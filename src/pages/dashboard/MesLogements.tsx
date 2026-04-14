import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, AlertCircle, Home } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useUserHomes } from '@/hooks/queries'
import { HomeCard } from './mes-logements/HomeCard'
import { AddHomeModal } from './mes-logements/AddHomeModal'

export default function MesLogements() {
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const { data: homes = [], isLoading, error } = useUserHomes(user?.id)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Mes logements</h1>
          <p className="font-body text-text-secondary mt-1">
            Gérez les informations de vos biens immobiliers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          Impossible de charger vos logements. Veuillez réessayer.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && homes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 mb-4">
            <Home size={28} />
          </div>
          <h2 className="font-display text-xl text-text-primary mb-2">
            Aucun logement enregistré
          </h2>
          <p className="font-body text-text-secondary text-sm max-w-xs mb-6">
            Ajoutez votre premier logement pour commencer à suivre vos projets de rénovation.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            Ajouter un logement
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && homes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {homes.map(home => (
            <HomeCard
              key={home.id}
              home={home}
              onClick={() => navigate(`/mes-logements/${home.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && user && (
        <AddHomeModal
          userId={user.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
