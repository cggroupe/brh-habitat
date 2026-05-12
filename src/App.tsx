import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import PublicShell from '@/components/layout/PublicShell'
import AppShell from '@/components/layout/AppShell'
import AdminShell from '@/components/layout/AdminShell'
import ProShell from '@/components/layout/ProShell'
import ParticulierShell from '@/components/layout/ParticulierShell'
import EmployeShell from '@/components/layout/EmployeShell'
import EmployeGuard from '@/components/auth/EmployeGuard'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'
import ProGuard from '@/components/auth/ProGuard'
import ParticulierGuard from '@/components/auth/ParticulierGuard'
import ArtisanGuard from '@/components/auth/ArtisanGuard'
import ArtisanShell from '@/components/layout/ArtisanShell'
import AgenceGuard from '@/components/auth/AgenceGuard'
import AgenceShell from '@/components/layout/AgenceShell'
import ReseauPortalShell from '@/components/layout/ReseauPortalShell'
import ReseauGuard from '@/components/auth/ReseauGuard'
import { FeatureRoute } from '@/components/shared/FeatureGate'
import { PermissionRoute } from '@/components/auth/PermissionRoute'

// Eagerly loaded (above the fold)
import HomePage from '@/pages/public/HomePage'

// Lazy loaded pages — Public
// DiagnosticPage (ancien wizard 5 étapes) conservé dans le repo mais non monté
// — `/diagnostic` pointe vers le hub Simulateur depuis le retour Philippe 12/05.
// const DiagnosticPage = lazy(() => import('@/pages/public/DiagnosticPage'))
const DiagnosticExpressPage = lazy(() => import('@/pages/public/DiagnosticExpressPage'))
const DiagnosticResultsPage = lazy(() => import('@/pages/public/DiagnosticResultsPage'))
// Simulateur particulier (hub + flow problème + wizard complet 25-30 min).
// Cf audit-ux-2026-05-12 #7 — porté depuis le moteur 3CL-DPE déjà livré.
const SimulateurPage = lazy(() => import('@/pages/public/Simulateur'))
const SimulateurProblemePage = lazy(() => import('@/pages/public/SimulateurProbleme'))
const SimulateurCompletPage = lazy(() => import('@/pages/public/SimulateurComplet'))
const ArticlesPage = lazy(() => import('@/pages/public/ArticlesPage'))
const ArticlePage = lazy(() => import('@/pages/public/ArticlePage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const RegisterProPage = lazy(() => import('@/pages/public/RegisterProPage'))
const RegisterHubPage = lazy(() => import('@/pages/public/RegisterHubPage'))
// RegisterProFinalisationPage supprimee - la creation de company se fait dans RegisterProPage directement
// RegisterParticulierPage supprimee - tout passe par /inscription (Clerk)
const ServicesPage = lazy(() => import('@/pages/public/ServicesPage'))
const MentionsLegalesPage = lazy(() => import('@/pages/public/MentionsLegalesPage'))
const PolitiqueConfidentialitePage = lazy(() => import('@/pages/public/PolitiqueConfidentialitePage'))
const PartenairesPage = lazy(() => import('@/pages/public/PartenairesPage'))
const AssistantPage = lazy(() => import('@/pages/public/AssistantPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const OptOutPage = lazy(() => import('@/pages/public/OptOutPage'))
const InscriptionAgencePage = lazy(() => import('@/pages/public/InscriptionAgencePage'))
const PublicProAnnuaire = lazy(() => import('@/pages/public/PublicProAnnuaire'))

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
const EmployeDashboard = lazy(() => import('@/pages/employe/EmployeDashboard'))
const EmployeMails = lazy(() => import('@/pages/employe/EmployeMails'))
const EmployeCalendrier = lazy(() => import('@/pages/employe/EmployeCalendrier'))
const EmployeSocial = lazy(() => import('@/pages/employe/EmployeSocial'))
const EmployeLeads = lazy(() => import('@/pages/employe/EmployeLeads'))
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
const AdminOptOutRequests = lazy(() => import('@/pages/admin/AdminOptOutRequests'))
const AdminAgenceSocialPosts = lazy(() => import('@/pages/admin/AdminAgenceSocialPosts'))
const AdminReseauModeration = lazy(() => import('@/pages/admin/AdminReseauModeration'))
const AdminPartnerContracts = lazy(() => import('@/pages/admin/AdminPartnerContracts'))
const AdminAgenceAudits = lazy(() => import('@/pages/admin/AdminAgenceAudits'))
const AdminLeadAssignments = lazy(() => import('@/pages/admin/AdminLeadAssignments'))
const AdminProspects = lazy(() => import('@/pages/admin/AdminProspects'))
const AdminCommissionsArtisans = lazy(() => import('@/pages/admin/AdminCommissionsArtisans'))
const AdminCommissions = lazy(() => import('@/pages/admin/AdminCommissions'))
const AdminCatalogue = lazy(() => import('@/pages/admin/AdminCatalogue'))
const AdminParametres = lazy(() => import('@/pages/admin/AdminParametres'))
const AdminQuotas = lazy(() => import('@/pages/admin/AdminQuotas'))

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
// Phase 17.1 — Portail artisan enrichi (skeletons cliquables)
const ArtisanSimulateur = lazy(() => import('@/pages/artisan/ArtisanSimulateur'))
const ArtisanChiffrage = lazy(() => import('@/pages/artisan/ArtisanChiffrage'))
const ArtisanLeads = lazy(() => import('@/pages/artisan/ArtisanLeads'))
const ArtisanReseau = lazy(() => import('@/pages/artisan/ArtisanReseau'))
const ArtisanReseauxSociaux = lazy(() => import('@/pages/artisan/ArtisanReseauxSociaux'))
const ArtisanQRCode = lazy(() => import('@/pages/artisan/ArtisanQRCode'))
const ArtisanProgression = lazy(() => import('@/pages/artisan/ArtisanProgression'))
// Phase 18.4 — Réseau social pro (transverse 4 personae)
// Phase 18 v2 (pivot 12/05/2026) : ReseauFeed et ReseauDecouvrir conservés
// dans le repo pour réversibilité mais retirés du router. Le hub `/reseau`
// est maintenant ReseauHub (page d'action structurée : publier chantier OU dispo).
const ReseauHub = lazy(() => import('@/pages/reseau/ReseauHub'))
const ReseauProfil = lazy(() => import('@/pages/reseau/ReseauProfil'))
const ReseauChantiers = lazy(() => import('@/pages/reseau/ReseauChantiers'))
const ReseauChantierNew = lazy(() => import('@/pages/reseau/ReseauChantierNew'))
const ReseauChantierDetail = lazy(() => import('@/pages/reseau/ReseauChantierDetail'))
const ReseauDisponibilites = lazy(() => import('@/pages/reseau/ReseauDisponibilites'))
const ReseauDisponibiliteNew = lazy(() => import('@/pages/reseau/ReseauDisponibiliteNew'))
const ReseauAbonnement = lazy(() => import('@/pages/reseau/ReseauAbonnement'))
const ReseauConnexions = lazy(() => import('@/pages/reseau/ReseauConnexions'))
const ReseauMessages = lazy(() => import('@/pages/reseau/ReseauMessages'))
const ReseauParamsAutaf = lazy(() => import('@/pages/reseau/ReseauParamsAutaf'))
const AgenceDashboard = lazy(() => import('@/pages/agence/AgenceDashboard'))
const AgenceLeads = lazy(() => import('@/pages/agence/AgenceLeads'))
const AgenceScoreVente = lazy(() => import('@/pages/agence/AgenceScoreVente'))
const AgenceAbonnement = lazy(() => import('@/pages/agence/AgenceAbonnement'))
const AgenceProfil = lazy(() => import('@/pages/agence/AgenceProfil'))
// Phase 19 Sprint A — Foncier Pro
const AgenceFoncierCarte = lazy(() => import('@/pages/agence/foncier/AgenceFoncierCarte'))
const AgenceFoncierFavoris = lazy(() => import('@/pages/agence/foncier/AgenceFoncierFavoris'))
// Phase 11.4 — Tableau prospects DPE F/G filtrable
const AgenceFoncierProspects = lazy(() => import('@/pages/agence/foncier/AgenceFoncierProspects'))
// Phase 11.7 — Leaderboard Bretagne (refonte UX MLM)
const AgenceLeaderboard = lazy(() => import('@/pages/agence/AgenceLeaderboard'))
// Phase 19 Sprint B — SCI enrichi
const AgenceFoncierSci = lazy(() => import('@/pages/agence/foncier/AgenceFoncierSci'))
// Phase 19 Sprint E — Tertiaire (BODACC + permis)
const AgenceFoncierTertiaire = lazy(() => import('@/pages/agence/foncier/AgenceFoncierTertiaire'))
// Phase 19 Sprint F — Page détail parcelle complète
const AgenceFoncierParcelleDetail = lazy(() => import('@/pages/agence/foncier/AgenceFoncierParcelleDetail'))
const AgenceContributions = lazy(() => import('@/pages/agence/AgenceContributions'))
const AgenceProgression = lazy(() => import('@/pages/agence/AgenceProgression'))
const AgenceSimulateur = lazy(() => import('@/pages/agence/AgenceSimulateur'))
const AgenceSocial = lazy(() => import('@/pages/agence/AgenceSocial'))
const AgenceParrainage = lazy(() => import('@/pages/agence/AgenceParrainage'))
const AgenceParrainageHowItWorks = lazy(() => import('@/pages/agence/AgenceParrainageHowItWorks'))
const AgenceEquipe = lazy(() => import('@/pages/agence/AgenceEquipe'))
const AgenceQRCode = lazy(() => import('@/pages/agence/AgenceQRCode'))
const AgenceMessages = lazy(() => import('@/pages/agence/AgenceMessages'))
const AgenceVitrinePage = lazy(() => import('@/pages/public/AgenceVitrinePage'))

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
              {/* `/diagnostic` = entry point principal (le path historique).
                 Pointe maintenant vers le hub Simulateur (3 cards : Problème / Rapide / Complet).
                 L'ancien wizard 5 étapes DiagnosticPage reste dans le repo mais non monté
                 (cf retour Philippe 12/05 — il ne veut plus partir directement sur le pré-rempli isolation). */}
              <Route path="/diagnostic" element={<SimulateurPage />} />
              <Route path="/diagnostic-express" element={<DiagnosticExpressPage />} />
              {/* Simulateur particulier — hub + flow problème + wizard complet (audit-ux-2026-05-12 #7) */}
              <Route path="/simulateur" element={<SimulateurPage />} />
              <Route path="/simulateur/probleme" element={<SimulateurProblemePage />} />
              <Route path="/simulateur/complet" element={<SimulateurCompletPage />} />
              {/* Phase 13.6.5 — Magic link onboarding artisan (public, magic link Supabase) */}
              <Route path="/artisan/onboarding/:token" element={<ArtisanOnboarding />} />
              <Route path="/diagnostic/resultats/local" element={<DiagnosticResultsPage />} />
              <Route path="/diagnostic/resultats/:id" element={<DiagnosticResultsPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:slug" element={<ArticlePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              {/* Phase A 2026-05-08 — /inscription = hub 3 cards (Particulier / Pro / Agence) */}
              <Route path="/inscription" element={<RegisterHubPage />} />
              <Route path="/inscription/particulier" element={<RegisterPage />} />
              <Route path="/inscription/pro" element={<RegisterProPage />} />
              <Route path="/inscription/pro/rejoindre" element={<JoinCompanyPage />} />
              <Route path="/partenaires" element={<PartenairesPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
              <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialitePage />} />
              <Route path="/opt-out" element={<OptOutPage />} />
              <Route path="/inscription/agence" element={<InscriptionAgencePage />} />
              {/* Phase 18.11 — Annuaire SEO publique : 75 combos dept × métier */}
              <Route path="/pros/:dept/:metier" element={<PublicProAnnuaire />} />
              <Route path="/a/:agenceId" element={<AgenceVitrinePage />} />
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

            {/* Phase R4 + Phase 17.1 — Portail artisan elevé (ArtisanGuard + ArtisanShell) */}
            <Route element={<ArtisanGuard />}>
              <Route element={<ArtisanShell />}>
                <Route path="/artisan" element={<ArtisanDashboard />} />
                <Route path="/artisan/missions" element={<ArtisanMissions />} />
                {/* Phase 17.1 — 7 nouvelles entrées (skeletons cliquables) */}
                <Route path="/artisan/simulateur" element={<ArtisanSimulateur />} />
                <Route path="/artisan/chiffrage" element={<ArtisanChiffrage />} />
                <Route path="/artisan/leads" element={<ArtisanLeads />} />
                <Route path="/artisan/reseau" element={<ArtisanReseau />} />
                <Route path="/artisan/reseaux-sociaux" element={<ArtisanReseauxSociaux />} />
                <Route path="/artisan/qr-code" element={<ArtisanQRCode />} />
                <Route path="/artisan/progression" element={<ArtisanProgression />} />
                <Route path="/artisan/agenda" element={<ArtisanAgenda />} />
                <Route path="/artisan/factures" element={<ArtisanFactures />} />
                <Route path="/artisan/profil" element={<ArtisanProfil />} />
                <Route path="/artisan/messages" element={<ArtisanMessages />} />
                {/* Redirect legacy /artisan/dashboard → /artisan */}
                <Route path="/artisan/dashboard" element={<Navigate to="/artisan" replace />} />
              </Route>
            </Route>

            {/* Phase D (2026-05-08) — Réseau pro cross-persona.
                ReseauGuard accepte agences (brh_partner_contracts) ET pros (brh_companies).
                ReseauPortalShell détecte le portail dominant de l'user et rend le shell
                adapté (AgenceShell pour agences, ProShell pour pros).
                /reseau/profil/:slug reste public-friendly (vitrine) — utilise PublicShell. */}
            <Route element={<ReseauGuard />}>
              <Route element={<ReseauPortalShell />}>
                {/* Hub action (Phase 18 v2) — remplace l'ancien feed libre. */}
                <Route path="/reseau" element={<ReseauHub />} />
                <Route path="/reseau/chantiers" element={<ReseauChantiers />} />
                <Route path="/reseau/chantiers/nouveau" element={<ReseauChantierNew />} />
                <Route path="/reseau/chantiers/:id" element={<ReseauChantierDetail />} />
                <Route path="/reseau/disponibilites" element={<ReseauDisponibilites />} />
                <Route path="/reseau/disponibilites/nouvelle" element={<ReseauDisponibiliteNew />} />
                <Route path="/reseau/connexions" element={<ReseauConnexions />} />
                <Route path="/reseau/messages" element={<ReseauMessages />} />
                <Route path="/reseau/parametres/autaf" element={<ReseauParamsAutaf />} />
                <Route path="/reseau/profil/:slug" element={<ReseauProfil />} />
                <Route path="/reseau/abonnement" element={<ReseauAbonnement />} />
                {/* Redirects rétrocompat depuis Phase 18 v1 (feed libre supprimé). */}
                <Route path="/reseau/decouvrir" element={<Navigate to="/reseau" replace />} />
              </Route>
            </Route>

            {/* Phase 16.0.6 — Portail agence immobilière (AgenceGuard + AgenceShell) */}
            <Route element={<AgenceGuard />}>
              <Route element={<AgenceShell />}>
                <Route path="/agence" element={<AgenceDashboard />} />
                <Route path="/agence/leads" element={<AgenceLeads />} />
                <Route path="/agence/leaderboard" element={<AgenceLeaderboard />} />
                <Route path="/agence/score-vente" element={<AgenceScoreVente />} />
                <Route path="/agence/simulateur" element={<AgenceSimulateur />} />
                <Route path="/agence/contributions" element={<AgenceContributions />} />
                <Route path="/agence/progression" element={<AgenceProgression />} />
                <Route path="/agence/reseaux-sociaux" element={<AgenceSocial />} />
                <Route path="/agence/parrainage" element={<AgenceParrainage />} />
                <Route path="/agence/parrainage/comment-ca-marche" element={<AgenceParrainageHowItWorks />} />
                <Route path="/agence/equipe" element={<AgenceEquipe />} />
                <Route path="/agence/qr-code" element={<AgenceQRCode />} />
                <Route path="/agence/messages" element={<AgenceMessages />} />
                <Route path="/agence/abonnement" element={<AgenceAbonnement />} />
                <Route path="/agence/profil" element={<AgenceProfil />} />
                {/* Phase 19 Sprint A — Foncier Pro */}
                <Route path="/agence/foncier/carte" element={<AgenceFoncierCarte />} />
                <Route path="/agence/foncier/prospects" element={<AgenceFoncierProspects />} />
                <Route path="/agence/foncier/favoris" element={<AgenceFoncierFavoris />} />
                <Route path="/agence/foncier/sci" element={<AgenceFoncierSci />} />
                <Route path="/agence/foncier/tertiaire" element={<AgenceFoncierTertiaire />} />
                <Route path="/agence/foncier/parcelle/:idu" element={<AgenceFoncierParcelleDetail />} />
              </Route>
            </Route>

            {/* Employé BRH routes — cockpit dédié pour les commerciaux/opérationnels BRH.
                Réutilise les composants /agence/foncier/* et /pro/prospects-bretagne. */}
            <Route element={<EmployeGuard />}>
              <Route element={<EmployeShell />}>
                <Route path="/employe" element={<EmployeDashboard />} />
                <Route path="/employe/foncier/carte" element={<AgenceFoncierCarte />} />
                <Route path="/employe/foncier/prospects" element={<AgenceFoncierProspects />} />
                <Route path="/employe/foncier/favoris" element={<AgenceFoncierFavoris />} />
                <Route path="/employe/foncier/sci" element={<AgenceFoncierSci />} />
                <Route path="/employe/foncier/tertiaire" element={<AgenceFoncierTertiaire />} />
                <Route path="/employe/foncier/parcelle/:idu" element={<AgenceFoncierParcelleDetail />} />
                <Route path="/employe/prospection/bretagne" element={<ProProspectsBretagne />} />
                <Route path="/employe/prospection/carte" element={<ProProspectsCarte />} />
                <Route path="/employe/simulateur" element={<AgenceSimulateur />} />
                {/* Phase Employé V2.2 + V2.3 + V2.4 + V2.5 — tous livrés */}
                <Route path="/employe/mails" element={<EmployeMails />} />
                <Route path="/employe/calendrier" element={<EmployeCalendrier />} />
                <Route path="/employe/social" element={<EmployeSocial />} />
                <Route path="/employe/leads" element={<EmployeLeads />} />
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
                <Route path="/admin/opt-out-requests" element={<AdminOptOutRequests />} />
                <Route path="/admin/agence-social-posts" element={<AdminAgenceSocialPosts />} />
                <Route path="/admin/reseau-moderation" element={<AdminReseauModeration />} />
                <Route path="/admin/partner-contracts" element={<AdminPartnerContracts />} />
                <Route path="/admin/agence-audits" element={<AdminAgenceAudits />} />
                <Route path="/admin/lead-assignments" element={<AdminLeadAssignments />} />
                <Route path="/admin/prospects" element={<AdminProspects />} />
                <Route path="/admin/commissions-artisans" element={<AdminCommissionsArtisans />} />
                <Route path="/admin/commissions" element={<AdminCommissions />} />
                <Route path="/admin/catalogue" element={<AdminCatalogue />} />
                <Route path="/admin/parametres" element={<AdminParametres />} />
                <Route path="/admin/quotas" element={<AdminQuotas />} />
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
