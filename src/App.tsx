import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import PublicShell from '@/components/layout/PublicShell'
import AppShell from '@/components/layout/AppShell'
import AdminShell from '@/components/layout/AdminShell'
import ProShell from '@/components/layout/ProShell'
import ParticulierShell from '@/components/layout/ParticulierShell'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'
import ProGuard from '@/components/auth/ProGuard'
import ParticulierGuard from '@/components/auth/ParticulierGuard'
import ArtisanGuard from '@/components/auth/ArtisanGuard'
import ArtisanShell from '@/components/layout/ArtisanShell'
import AgenceGuard from '@/components/auth/AgenceGuard'
import AgenceShell from '@/components/layout/AgenceShell'
import { FeatureRoute } from '@/components/shared/FeatureGate'
import { PermissionRoute } from '@/components/auth/PermissionRoute'

// Eagerly loaded (above the fold)
import HomePage from '@/pages/public/HomePage'

// Lazy loaded pages — Public
const DiagnosticPage = lazy(() => import('@/pages/public/DiagnosticPage'))
const DiagnosticExpressPage = lazy(() => import('@/pages/public/DiagnosticExpressPage'))
const DiagnosticResultsPage = lazy(() => import('@/pages/public/DiagnosticResultsPage'))
const ArticlesPage = lazy(() => import('@/pages/public/ArticlesPage'))
const ArticlePage = lazy(() => import('@/pages/public/ArticlePage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const RegisterProPage = lazy(() => import('@/pages/public/RegisterProPage'))
// RegisterProFinalisationPage supprimee - la creation de company se fait dans RegisterProPage directement
// RegisterParticulierPage supprimee - tout passe par /inscription (Clerk)
const ServicesPage = lazy(() => import('@/pages/public/ServicesPage'))
const MentionsLegalesPage = lazy(() => import('@/pages/public/MentionsLegalesPage'))
const PolitiqueConfidentialitePage = lazy(() => import('@/pages/public/PolitiqueConfidentialitePage'))
const PartenairesPage = lazy(() => import('@/pages/public/PartenairesPage'))
const AssistantPage = lazy(() => import('@/pages/public/AssistantPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const OptOutPage = lazy(() => import('@/pages/public/OptOutPage'))

// Lazy loaded pages — Dashboard (user)
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const MesLogements = lazy(() => import('@/pages/dashboard/MesLogements'))
const LogementDetail = lazy(() => import('@/pages/dashboard/LogementDetail'))
const MesDossiers = lazy(() => import('@/pages/dashboard/MesDossiers'))
const DossierDetail = lazy(() => import('@/pages/dashboard/DossierDetail'))
const MesRdv = lazy(() => import('@/pages/dashboard/MesRdv'))
const ProfilPage = lazy(() => import('@/pages/dashboard/ProfilPage'))

// Lazy loaded pages — Admin
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminLogements = lazy(() => import('@/pages/admin/AdminLogements'))
const AdminDossiers = lazy(() => import('@/pages/admin/AdminDossiers'))
const AdminDossierDetail = lazy(() => import('@/pages/admin/AdminDossierDetail'))
const AdminRdv = lazy(() => import('@/pages/admin/AdminRdv'))
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'))
const AdminArticles = lazy(() => import('@/pages/admin/AdminArticles'))
const AdminUtilisateurs = lazy(() => import('@/pages/admin/AdminUtilisateurs'))
const AdminPartenaires = lazy(() => import('@/pages/admin/AdminPartenaires'))
const AdminAgencesImmo = lazy(() => import('@/pages/admin/AdminAgencesImmo'))
const AdminScoreVente = lazy(() => import('@/pages/admin/AdminScoreVente'))
const AdminProspects = lazy(() => import('@/pages/admin/AdminProspects'))
const AdminCommissionsArtisans = lazy(() => import('@/pages/admin/AdminCommissionsArtisans'))
const AdminCommissions = lazy(() => import('@/pages/admin/AdminCommissions'))
const AdminCatalogue = lazy(() => import('@/pages/admin/AdminCatalogue'))
const AdminParametres = lazy(() => import('@/pages/admin/AdminParametres'))

// Lazy loaded pages — Pro
const ProDashboard = lazy(() => import('@/pages/pro/ProDashboard'))
const ProProspects = lazy(() => import('@/pages/pro/ProProspects'))
const ProProspectNew = lazy(() => import('@/pages/pro/ProProspectNew'))
const ProProspectDetail = lazy(() => import('@/pages/pro/ProProspectDetail'))
const ProCommissions = lazy(() => import('@/pages/pro/ProCommissions'))
const ProEquipe = lazy(() => import('@/pages/pro/ProEquipe'))
const ProMessages = lazy(() => import('@/pages/pro/ProMessages'))
const ProProfil = lazy(() => import('@/pages/pro/ProProfil'))
const ProSocial = lazy(() => import('@/pages/pro/ProSocial'))
const ProQRCode = lazy(() => import('@/pages/pro/ProQRCode'))
const AdminPublications = lazy(() => import('@/pages/admin/AdminPublications'))
const ProVendeurs = lazy(() => import('@/pages/pro/ProVendeurs'))
// Phase R3 — ProAssistant / ProChiffrage / ProChiffrages fusionnés dans ProIA (Phase R3),
// fichiers legacy supprimés en Phase R7. Les anciennes URLs redirectent en 301.
const ProTeamStats = lazy(() => import('@/pages/pro/ProTeamStats'))
const ProRapport = lazy(() => import('@/pages/pro/ProRapport'))
const ProAuditsList = lazy(() => import('@/pages/pro/ProAuditsList'))
const ProAuditEditor = lazy(() => import('@/pages/pro/ProAuditEditor'))
const ProAuditResults = lazy(() => import('@/pages/pro/ProAuditResults'))
const ProProspectsBretagne = lazy(() => import('@/pages/pro/ProProspectsBretagne'))
const ProProspectsCarte = lazy(() => import('@/pages/pro/ProProspectsCarte'))
const ProAnalytics = lazy(() => import('@/pages/pro/ProAnalytics'))
const ProAbonnement = lazy(() => import('@/pages/pro/ProAbonnement'))
const ProMarketplaceArtisans = lazy(() => import('@/pages/pro/ProMarketplaceArtisans'))
const ProMesLeadsArtisans = lazy(() => import('@/pages/pro/ProMesLeadsArtisans'))
const ProTerrain = lazy(() => import('@/pages/pro/ProTerrain'))
const ProIA = lazy(() => import('@/pages/pro/ProIA'))
const ProIAHistorique = lazy(() => import('@/pages/pro/ProIAHistorique'))
const ArtisanDashboard = lazy(() => import('@/pages/artisan/ArtisanDashboard'))
const ArtisanOnboarding = lazy(() => import('@/pages/artisan/ArtisanOnboarding'))
const ArtisanFactures = lazy(() => import('@/pages/artisan/ArtisanFactures'))
const ArtisanMissions = lazy(() => import('@/pages/artisan/ArtisanMissions'))
const ArtisanAgenda = lazy(() => import('@/pages/artisan/ArtisanAgenda'))
const ArtisanProfil = lazy(() => import('@/pages/artisan/ArtisanProfil'))
const ArtisanMessages = lazy(() => import('@/pages/artisan/ArtisanMessages'))
const AgenceDashboard = lazy(() => import('@/pages/agence/AgenceDashboard'))

// Phase 17 — PWA install prompt (non-lazy, léger)
import { InstallPwaPrompt } from '@/components/pwa/InstallPwaPrompt'
const AuditView = lazy(() => import('@/pages/AuditView'))

// Lazy loaded pages — Particulier
const PartDashboard = lazy(() => import('@/pages/particulier/PartDashboard'))
const PartParrainages = lazy(() => import('@/pages/particulier/PartParrainages'))
const PartParrainageNew = lazy(() => import('@/pages/particulier/PartParrainageNew'))
const PartCatalogue = lazy(() => import('@/pages/particulier/PartCatalogue'))
const PartPoints = lazy(() => import('@/pages/particulier/PartPoints'))
const PartMessages = lazy(() => import('@/pages/particulier/PartMessages'))
const PartSocial = lazy(() => import('@/pages/particulier/PartSocial'))
const PartSimulation = lazy(() => import('@/pages/particulier/PartSimulation'))
const PartVendeurs = lazy(() => import('@/pages/particulier/PartVendeurs'))
// Phase R7 — PartAssistant / PartChiffrage / PartChiffrages fusionnés dans PartIA.
const PartIA = lazy(() => import('@/pages/particulier/PartIA'))
const PartIAHistorique = lazy(() => import('@/pages/particulier/PartIAHistorique'))
const PartBadges = lazy(() => import('@/pages/particulier/PartBadges'))
const PartStatutFiscal = lazy(() => import('@/pages/particulier/PartStatutFiscal'))
// PostLoginRedirect supprimee - les pages Login/Register naviguent directement selon le role
const JoinCompanyPage = lazy(() => import('@/pages/public/JoinCompanyPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min par defaut (donnees user)
      retry: 1,
      refetchOnWindowFocus: false,
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
        <InstallPwaPrompt />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              <Route path="/diagnostic-express" element={<DiagnosticExpressPage />} />
              {/* Phase 13.6.5 — Magic link onboarding artisan (public, magic link Supabase) */}
              <Route path="/artisan/onboarding/:token" element={<ArtisanOnboarding />} />
              <Route path="/diagnostic/resultats/local" element={<DiagnosticResultsPage />} />
              <Route path="/diagnostic/resultats/:id" element={<DiagnosticResultsPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:slug" element={<ArticlePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              <Route path="/inscription" element={<RegisterPage />} />
              <Route path="/inscription/pro" element={<RegisterProPage />} />
              <Route path="/inscription/pro/rejoindre" element={<JoinCompanyPage />} />
              {/* Legacy redirect : /inscription/particulier -> /inscription (conserve les liens partages) */}
              <Route path="/inscription/particulier" element={<Navigate to="/inscription" replace />} />
              <Route path="/partenaires" element={<PartenairesPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialitePage />} />
              <Route path="/opt-out" element={<OptOutPage />} />
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
                <Route path="/audit-energetique/:id" element={<AuditView />} />
              </Route>
            </Route>

            {/* Phase R4 — Portail artisan elevé (ArtisanGuard + ArtisanShell) */}
            <Route element={<ArtisanGuard />}>
              <Route element={<ArtisanShell />}>
                <Route path="/artisan" element={<ArtisanDashboard />} />
                <Route path="/artisan/missions" element={<ArtisanMissions />} />
                <Route path="/artisan/agenda" element={<ArtisanAgenda />} />
                <Route path="/artisan/factures" element={<ArtisanFactures />} />
                <Route path="/artisan/profil" element={<ArtisanProfil />} />
                <Route path="/artisan/messages" element={<ArtisanMessages />} />
                {/* Redirect legacy /artisan/dashboard → /artisan */}
                <Route path="/artisan/dashboard" element={<Navigate to="/artisan" replace />} />
              </Route>
            </Route>

            {/* Phase 16.0.6 — Portail agence immobilière (AgenceGuard + AgenceShell) */}
            <Route element={<AgenceGuard />}>
              <Route element={<AgenceShell />}>
                <Route path="/agence" element={<AgenceDashboard />} />
                {/* Pages futures : /agence/leads, /agence/score-vente, /agence/abonnement, /agence/profil */}
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
                <Route path="/admin/partenaires" element={<AdminPartenaires />} />
                <Route path="/admin/agences-immo" element={<AdminAgencesImmo />} />
                <Route path="/admin/score-vente" element={<AdminScoreVente />} />
                <Route path="/admin/prospects" element={<AdminProspects />} />
                <Route path="/admin/commissions-artisans" element={<AdminCommissionsArtisans />} />
                <Route path="/admin/commissions" element={<AdminCommissions />} />
                <Route path="/admin/catalogue" element={<AdminCatalogue />} />
                <Route path="/admin/parametres" element={<AdminParametres />} />
                <Route path="/admin/publications" element={<AdminPublications />} />
              </Route>
            </Route>

            {/* Pro routes */}
            <Route element={<ProGuard />}>
              <Route element={<ProShell />}>
                <Route path="/pro" element={<ProDashboard />} />
                <Route path="/pro/prospects" element={<ProProspects />} />
                <Route path="/pro/prospects/nouveau" element={<ProProspectNew />} />
                <Route path="/pro/prospects/:id" element={<ProProspectDetail />} />
                <Route path="/pro/commissions" element={<PermissionRoute permission="canViewFinance"><ProCommissions /></PermissionRoute>} />
                <Route path="/pro/equipe" element={<ProEquipe />} />
                <Route path="/pro/messages" element={<ProMessages />} />
                <Route path="/pro/profil" element={<ProProfil />} />
                <Route path="/pro/reseaux-sociaux" element={<FeatureRoute feature="socialMediaPosts"><ProSocial /></FeatureRoute>} />
                <Route path="/pro/qrcode" element={<FeatureRoute feature="qrCodeGeneration"><ProQRCode /></FeatureRoute>} />
                <Route path="/pro/vendeurs" element={<FeatureRoute feature="recruitmentPyramid"><ProVendeurs /></FeatureRoute>} />
                {/* Phase R3 — routes /pro/assistant + /pro/chiffrage + /pro/chiffrages
                    déplacées en redirects 301 plus bas (vers /pro/ia unifié). */}
                <Route path="/pro/stats-equipe" element={<FeatureRoute feature="teamStats"><ProTeamStats /></FeatureRoute>} />
                <Route path="/pro/rapport" element={<PermissionRoute permission="canViewFinance"><FeatureRoute feature="monthlyPdfReport"><ProRapport /></FeatureRoute></PermissionRoute>} />
                <Route path="/pro/audits" element={<ProAuditsList />} />
                <Route path="/pro/audits/nouveau" element={<ProAuditEditor />} />
                <Route path="/pro/audits/:id" element={<ProAuditEditor />} />
                <Route path="/pro/audits/:id/results" element={<ProAuditResults />} />
                <Route path="/pro/prospects-bretagne" element={<ProProspectsBretagne />} />
                <Route path="/pro/prospects-carte" element={<ProProspectsCarte />} />
                <Route path="/pro/analytics" element={<PermissionRoute permission="canViewFinance"><ProAnalytics /></PermissionRoute>} />
                <Route path="/pro/abonnement" element={<PermissionRoute permission="canViewFinance"><ProAbonnement /></PermissionRoute>} />
                <Route path="/pro/marketplace-artisans" element={<ProMarketplaceArtisans />} />
                <Route path="/pro/mes-leads-artisans" element={<PermissionRoute permission="canViewFinance"><ProMesLeadsArtisans /></PermissionRoute>} />
                <Route path="/pro/terrain" element={<ProTerrain />} />
                <Route path="/pro/ia" element={<FeatureRoute feature="aiChiffrage"><ProIA /></FeatureRoute>} />
                <Route path="/pro/ia/historique" element={<FeatureRoute feature="aiChiffrage"><ProIAHistorique /></FeatureRoute>} />
                {/* Phase R3 — Redirects 301 routes legacy → /pro/ia */}
                <Route path="/pro/chiffrage" element={<Navigate to="/pro/ia?mode=chiffrage" replace />} />
                <Route path="/pro/chiffrages" element={<Navigate to="/pro/ia/historique" replace />} />
                <Route path="/pro/assistant" element={<Navigate to="/pro/ia?mode=dtu" replace />} />
              </Route>
            </Route>

            {/* Particulier routes */}
            <Route element={<ParticulierGuard />}>
              <Route element={<ParticulierShell />}>
                <Route path="/particulier" element={<PartDashboard />} />
                <Route path="/particulier/parrainages" element={<PartParrainages />} />
                <Route path="/particulier/parrainages/nouveau" element={<PartParrainageNew />} />
                <Route path="/particulier/catalogue" element={<FeatureRoute feature="catalogueCadeaux"><PartCatalogue /></FeatureRoute>} />
                <Route path="/particulier/points" element={<PartPoints />} />
                <Route path="/particulier/messages" element={<PartMessages />} />
                <Route path="/particulier/statut" element={<PartStatutFiscal />} />
                <Route path="/particulier/reseaux-sociaux" element={<FeatureRoute feature="socialMediaPosts"><PartSocial /></FeatureRoute>} />
                <Route path="/particulier/simulateur" element={<FeatureRoute feature="simulationLinks"><PartSimulation /></FeatureRoute>} />
                <Route path="/particulier/vendeurs" element={<FeatureRoute feature="recruitmentPyramid"><PartVendeurs /></FeatureRoute>} />
                {/* Phase R7 — IA particulier unifiée + redirects 301 */}
                <Route path="/particulier/ia" element={<FeatureRoute feature="aiChiffrage"><PartIA /></FeatureRoute>} />
                <Route path="/particulier/ia/historique" element={<FeatureRoute feature="aiChiffrage"><PartIAHistorique /></FeatureRoute>} />
                <Route path="/particulier/assistant" element={<Navigate to="/particulier/ia?mode=dtu" replace />} />
                <Route path="/particulier/chiffrage" element={<Navigate to="/particulier/ia?mode=chiffrage" replace />} />
                <Route path="/particulier/chiffrages" element={<Navigate to="/particulier/ia/historique" replace />} />
                <Route path="/particulier/badges" element={<FeatureRoute feature="badgesGamification"><PartBadges /></FeatureRoute>} />
                <Route path="/particulier/profil" element={<ProfilPage />} />
              </Route>
            </Route>

            {/* Catch-all 404 — wrapped in PublicShell for consistent Navbar/Footer */}
            <Route element={<PublicShell />}>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
