import { Outlet } from 'react-router-dom'
import DashboardNav from './DashboardNav'

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
