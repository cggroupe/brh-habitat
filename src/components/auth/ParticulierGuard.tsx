import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ParticulierGuard() {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary font-body text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />
  }

  if (user?.role !== 'particulier' && user?.role !== 'admin') {
    return <Navigate to="/tableau-de-bord" replace />
  }

  return <Outlet />
}
