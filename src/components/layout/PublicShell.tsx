import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileDrawer from './MobileDrawer'

export default function PublicShell() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <MobileDrawer />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
