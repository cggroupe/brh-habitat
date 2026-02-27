import { Link } from 'react-router-dom'
import { Home, FolderOpen, Calendar, ArrowRight, Search } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

export default function DashboardPage() {
  const { user } = useAppStore()

  const cards = [
    {
      icon: Search,
      label: 'Nouveau diagnostic',
      description: 'Lancez un diagnostic gratuit de votre logement',
      to: '/diagnostic',
      color: 'bg-green-50 text-primary',
    },
    {
      icon: Home,
      label: 'Mes logements',
      description: 'Gérez les informations de vos biens immobiliers',
      to: '/mes-logements',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: FolderOpen,
      label: 'Mes dossiers',
      description: 'Suivez vos dossiers de rénovation en cours',
      to: '/mes-dossiers',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: Calendar,
      label: 'Mes rendez-vous',
      description: 'Consultez et gérez vos rendez-vous',
      to: '/mes-rdv',
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-text-primary">Tableau de bord</h1>
        {user && (
          <p className="font-body text-text-secondary mt-1">
            Bienvenue, <span className="font-semibold text-primary">{user.full_name}</span>
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, description, to, color }) => (
          <Link
            key={to}
            to={to}
            className="group bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
              <Icon size={22} />
            </div>
            <h2 className="font-display text-base text-text-primary mb-1">{label}</h2>
            <p className="font-body text-sm text-text-secondary leading-relaxed">{description}</p>
            <div className="flex items-center gap-1 mt-4 text-primary text-sm font-body opacity-0 group-hover:opacity-100 transition-opacity">
              Acceder <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state info */}
      <div className="mt-10 bg-surface rounded-2xl border border-gray-light p-6">
        <h2 className="font-display text-xl text-text-primary mb-3">Commencez par un diagnostic</h2>
        <p className="font-body text-text-secondary text-sm leading-relaxed mb-4">
          Notre diagnostic gratuit permet d'identifier les problèmes de votre logement et de vous proposer les meilleures solutions adaptées à votre budget.
        </p>
        <Link
          to="/diagnostic"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          Lancer mon diagnostic <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
