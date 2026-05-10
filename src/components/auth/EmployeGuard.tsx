/**
 * Phase Employé BRH — Guard portail `/employe/*`.
 *
 * Vérifie que l'utilisateur est dans le registre `BRH_EMPLOYEES` (lib/brh-employees.ts).
 * Cette V1 utilise un registre statique par email. Une migration future remplacera
 * par une table DB `brh_employees`.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isBrhEmployee } from '@/lib/brh-employees'

export default function EmployeGuard() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/connexion" replace />
  if (!isBrhEmployee(user?.email)) return <Navigate to="/tableau-de-bord" replace />

  return <Outlet />
}
