import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import PublicShell from '@/components/layout/PublicShell'
import AppShell from '@/components/layout/AppShell'
import AdminShell from '@/components/layout/AdminShell'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'

// Eagerly loaded (above the fold)
import HomePage from '@/pages/public/HomePage'

// Lazy loaded pages
const DiagnosticPage = lazy(() => import('@/pages/public/DiagnosticPage'))
const DiagnosticResultsPage = lazy(() => import('@/pages/public/DiagnosticResultsPage'))
const ArticlesPage = lazy(() => import('@/pages/public/ArticlesPage'))
const ArticlePage = lazy(() => import('@/pages/public/ArticlePage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const ServicesPage = lazy(() => import('@/pages/public/ServicesPage'))
const MentionsLegalesPage = lazy(() => import('@/pages/public/MentionsLegalesPage'))
const PolitiqueConfidentialitePage = lazy(() => import('@/pages/public/PolitiqueConfidentialitePage'))

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const MesLogements = lazy(() => import('@/pages/dashboard/MesLogements'))
const LogementDetail = lazy(() => import('@/pages/dashboard/LogementDetail'))
const MesDossiers = lazy(() => import('@/pages/dashboard/MesDossiers'))
const DossierDetail = lazy(() => import('@/pages/dashboard/DossierDetail'))
const MesRdv = lazy(() => import('@/pages/dashboard/MesRdv'))
const ProfilPage = lazy(() => import('@/pages/dashboard/ProfilPage'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminLogements = lazy(() => import('@/pages/admin/AdminLogements'))
const AdminDossiers = lazy(() => import('@/pages/admin/AdminDossiers'))
const AdminDossierDetail = lazy(() => import('@/pages/admin/AdminDossierDetail'))
const AdminRdv = lazy(() => import('@/pages/admin/AdminRdv'))
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'))
const AdminArticles = lazy(() => import('@/pages/admin/AdminArticles'))
const AdminUtilisateurs = lazy(() => import('@/pages/admin/AdminUtilisateurs'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="inline-block w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              <Route path="/diagnostic/resultats/:id" element={<DiagnosticResultsPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:slug" element={<ArticlePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              <Route path="/inscription" element={<RegisterPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialitePage />} />
            </Route>

            {/* Authenticated user routes */}
            <Route element={<AuthGuard />}>
              <Route element={<AppShell />}>
                <Route path="/tableau-de-bord" element={<DashboardPage />} />
                <Route path="/mes-logements" element={<MesLogements />} />
                <Route path="/mes-logements/:id" element={<LogementDetail />} />
                <Route path="/mes-dossiers" element={<MesDossiers />} />
                <Route path="/mes-dossiers/:id" element={<DossierDetail />} />
                <Route path="/mes-rdv" element={<MesRdv />} />
                <Route path="/profil" element={<ProfilPage />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/logements" element={<AdminLogements />} />
                <Route path="/admin/dossiers" element={<AdminDossiers />} />
                <Route path="/admin/dossiers/:id" element={<AdminDossierDetail />} />
                <Route path="/admin/rdv" element={<AdminRdv />} />
                <Route path="/admin/messages" element={<AdminMessages />} />
                <Route path="/admin/articles" element={<AdminArticles />} />
                <Route path="/admin/utilisateurs" element={<AdminUtilisateurs />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
