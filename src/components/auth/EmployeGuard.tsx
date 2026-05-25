/**
 * Phase Employé BRH — Guard portail `/employe/*`.
 *
 * Vérifie que l'utilisateur est dans le registre `BRH_EMPLOYEES` (lib/brh-employees.ts)
 * hydraté depuis la table DB `brh_employees`.
 *
 * Fix 25/05 : await loadBrhEmployeesFromDb avant render pour éviter race
 * condition où un nouvel employé (post-seed statique) se voit refuser l'accès
 * lors du premier render avant que useAuth ait fini son hydration en background.
 */
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isBrhEmployee, loadBrhEmployeesFromDb } from '@/lib/brh-employees'

export default function EmployeGuard() {
  const { user, isAuthenticated, loading } = useAuth()
  const [cacheReady, setCacheReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void loadBrhEmployeesFromDb().finally(() => {
      if (!cancelled) setCacheReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  if (loading || (isAuthenticated && !cacheReady)) {
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
