import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// --- API imports ---
import {
  fetchUserHomes,
  fetchHomeById,
  fetchHomes,
  createHome,
  updateHome,
  deleteHome,
} from '@/api/homes'
import {
  fetchUserCases,
  fetchCaseById,
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
} from '@/api/cases'
import {
  fetchUserAppointments,
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/api/appointments'
import {
  fetchUserDiagnostics,
  fetchDiagnostics,
  fetchDiagnosticById,
  createDiagnostic,
  updateDiagnosticStatus,
  fetchUserDraftDiagnostic,
  fetchUserCompletedDiagnostics,
  upsertDraftDiagnostic,
  deleteDiagnostic,
} from '@/api/diagnostics'
import {
  fetchProfiles,
  fetchProfileById,
  updateProfile,
  updateProfileRole,
  deleteProfile,
} from '@/api/profiles'
import {
  fetchAllArticles,
  fetchPublishedArticles,
  fetchArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleArticlePublished,
} from '@/api/articles'
import { createContact, fetchContacts, updateContactStatus } from '@/api/contacts'
import {
  fetchDashboardStats,
  fetchRecentDiagnostics,
  fetchUserCounts,
} from '@/api/dashboard'
import {
  fetchHealthRecordsByHome,
  upsertHealthRecord,
  deleteHealthRecord,
} from '@/api/health-records'
import {
  fetchWorkHistoryByHome,
  createWorkEntry,
  updateWorkEntry,
  deleteWorkEntry,
} from '@/api/work-history'
import {
  fetchDocumentsByHome,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/api/home-documents'

// --- Type imports ---
import type { DiagnosticStatus, CaseStatus, ContactStatus, UserRole } from '@/types/database'
import type { HomeFilters } from '@/api/homes'
import type { AppointmentFilters } from '@/api/appointments'
import type { Database } from '@/types/database'

type HomeInsert = Database['public']['Tables']['brh_homes']['Insert']
type HomeUpdate = Database['public']['Tables']['brh_homes']['Update']
type CaseInsert = Database['public']['Tables']['brh_cases']['Insert']
type CaseUpdate = Database['public']['Tables']['brh_cases']['Update']
type AppointmentInsert = Database['public']['Tables']['brh_appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['brh_appointments']['Update']
type ContactInsert = Database['public']['Tables']['brh_contacts']['Insert']
type HealthRecordInsert = Database['public']['Tables']['brh_health_records']['Insert']
type WorkHistoryInsert = Database['public']['Tables']['brh_work_history']['Insert']
type WorkHistoryUpdate = Database['public']['Tables']['brh_work_history']['Update']
type HomeDocumentInsert = Database['public']['Tables']['brh_home_documents']['Insert']
type HomeDocumentUpdate = Database['public']['Tables']['brh_home_documents']['Update']
type DiagnosticInsert = Database['public']['Tables']['brh_diagnostics']['Insert']
type DiagnosticUpdate = Database['public']['Tables']['brh_diagnostics']['Update']
type ArticleInsert = Database['public']['Tables']['brh_articles']['Insert']
type ArticleUpdate = Database['public']['Tables']['brh_articles']['Update']
type ProfileUpdate = Omit<Database['public']['Tables']['profiles']['Update'], 'role'>

// ===========================================================================
// HOMES
// ===========================================================================

export function useUserHomes(userId: string | undefined) {
  return useQuery({
    queryKey: ['homes', 'user', userId],
    queryFn: () => fetchUserHomes(userId!),
    enabled: !!userId,
  })
}

export function useHomeDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['homes', 'detail', id],
    queryFn: () => fetchHomeById(id!),
    enabled: !!id,
  })
}

export function useAdminHomes(page: number, filters?: HomeFilters) {
  return useQuery({
    queryKey: ['homes', 'admin', page, filters],
    queryFn: () => fetchHomes(page, filters),
  })
}

export function useCreateHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HomeInsert) => createHome(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
    },
  })
}

export function useUpdateHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HomeUpdate }) =>
      updateHome(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
      queryClient.setQueryData(['homes', 'detail', data.id], data)
    },
  })
}

export function useDeleteHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
    },
  })
}

// ===========================================================================
// CASES
// ===========================================================================

export function useUserCases(userId: string | undefined) {
  return useQuery({
    queryKey: ['cases', 'user', userId],
    queryFn: () => fetchUserCases(userId!),
    enabled: !!userId,
  })
}

export function useCaseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => fetchCaseById(id!),
    enabled: !!id,
  })
}

export function useAdminCases(page: number, status?: CaseStatus) {
  return useQuery({
    queryKey: ['cases', 'admin', page, status],
    queryFn: () => fetchCases(page, status),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CaseInsert) => createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CaseUpdate }) =>
      updateCase(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.setQueryData(['cases', 'detail', data.id], data)
    },
  })
}

export function useDeleteCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// ===========================================================================
// APPOINTMENTS
// ===========================================================================

export function useUserAppointments(userId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'user', userId],
    queryFn: () => fetchUserAppointments(userId!),
    enabled: !!userId,
  })
}

export function useAdminAppointments(page: number, filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ['appointments', 'admin', page, filters],
    queryFn: () => fetchAppointments(page, filters),
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AppointmentInsert) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AppointmentUpdate }) =>
      updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

// ===========================================================================
// DIAGNOSTICS
// ===========================================================================

export function useUserDiagnostics(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'user', userId],
    queryFn: () => fetchUserDiagnostics(userId!),
    enabled: !!userId,
  })
}

export function useDiagnosticDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'detail', id],
    queryFn: () => fetchDiagnosticById(id!),
    enabled: !!id,
  })
}

export function useAdminDiagnostics(page: number, status?: DiagnosticStatus) {
  return useQuery({
    queryKey: ['diagnostics', 'admin', page, status],
    queryFn: () => fetchDiagnostics(page, status),
  })
}

export function useCreateDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DiagnosticInsert) => createDiagnostic(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
    },
  })
}

export function useUserDraftDiagnostic(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'draft', userId],
    queryFn: () => fetchUserDraftDiagnostic(userId!),
    enabled: !!userId,
  })
}

export function useUserCompletedDiagnostics(userId: string | undefined) {
  return useQuery({
    queryKey: ['diagnostics', 'completed', userId],
    queryFn: () => fetchUserCompletedDiagnostics(userId!),
    enabled: !!userId,
  })
}

export function useUpdateDiagnosticStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status: DiagnosticStatus
      adminNotes?: string
    }) => updateDiagnosticStatus(id, status, adminNotes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
      queryClient.setQueryData(['diagnostics', 'detail', data.id], data)
    },
  })
}

export function useUpsertDraftDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: string | null
      payload: DiagnosticUpdate & { user_id: string }
    }) => upsertDraftDiagnostic(draftId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
    },
  })
}

export function useDeleteDiagnostic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDiagnostic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] })
    },
  })
}

// ===========================================================================
// PROFILES
// ===========================================================================

export function useAdminProfiles(page: number) {
  return useQuery({
    queryKey: ['profiles', 'admin', page],
    queryFn: () => fetchProfiles(page),
  })
}

export function useProfileDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['profiles', 'detail', id],
    queryFn: () => fetchProfileById(id!),
    enabled: !!id,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProfileUpdate }) =>
      updateProfile(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.setQueryData(['profiles', 'detail', data.id], data)
    },
  })
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateProfileRole(id, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.setQueryData(['profiles', 'detail', data.id], data)
    },
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

// ===========================================================================
// ARTICLES
// ===========================================================================

export function usePublishedArticles(page = 0, category?: string) {
  return useQuery({
    queryKey: ['articles', 'published', page, category],
    queryFn: () => fetchPublishedArticles(page, category),
  })
}

export function useArticleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['articles', 'slug', slug],
    queryFn: () => fetchArticleBySlug(slug!),
    enabled: !!slug,
  })
}

export function useAdminArticles(page: number) {
  return useQuery({
    queryKey: ['articles', 'admin', page],
    queryFn: () => fetchAllArticles(page),
  })
}

export function useCreateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ArticleInsert) => createArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useUpdateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ArticleUpdate }) =>
      updateArticle(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.setQueryData(['articles', 'slug', data.slug], data)
    },
  })
}

export function useDeleteArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useToggleArticlePublished() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      toggleArticlePublished(id, published),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.setQueryData(['articles', 'slug', data.slug], data)
    },
  })
}

// ===========================================================================
// CONTACTS
// ===========================================================================

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContactInsert) => createContact(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useAdminContacts(page: number, status?: ContactStatus) {
  return useQuery({
    queryKey: ['contacts', 'admin', page, status],
    queryFn: () => fetchContacts(page, status),
  })
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status: ContactStatus
      adminNotes?: string
    }) => updateContactStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// ===========================================================================
// DASHBOARD / ADMIN STATS
// ===========================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
  })
}

export function useRecentDiagnostics(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'recent-diagnostics', limit],
    queryFn: () => fetchRecentDiagnostics(limit),
  })
}

export function useUserCounts(userIds: string[]) {
  return useQuery({
    queryKey: ['dashboard', 'user-counts', userIds],
    queryFn: () => fetchUserCounts(userIds),
    enabled: userIds.length > 0,
  })
}

// ===========================================================================
// HEALTH RECORDS (Carnet de sante)
// ===========================================================================

export function useHomeHealthRecords(homeId: string | undefined) {
  return useQuery({
    queryKey: ['health-records', homeId],
    queryFn: () => fetchHealthRecordsByHome(homeId!),
    enabled: !!homeId,
  })
}

export function useUpsertHealthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HealthRecordInsert) => upsertHealthRecord(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health-records', data.home_id] })
      queryClient.invalidateQueries({ queryKey: ['homes'] })
    },
  })
}

export function useDeleteHealthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; homeId: string }) => deleteHealthRecord(id),
    onSuccess: (_, { homeId }) => {
      queryClient.invalidateQueries({ queryKey: ['health-records', homeId] })
      queryClient.invalidateQueries({ queryKey: ['homes'] })
    },
  })
}

// ===========================================================================
// WORK HISTORY (Historique travaux)
// ===========================================================================

export function useHomeWorkHistory(homeId: string | undefined) {
  return useQuery({
    queryKey: ['work-history', homeId],
    queryFn: () => fetchWorkHistoryByHome(homeId!),
    enabled: !!homeId,
  })
}

export function useCreateWorkEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: WorkHistoryInsert) => createWorkEntry(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-history', data.home_id] })
    },
  })
}

export function useUpdateWorkEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkHistoryUpdate }) =>
      updateWorkEntry(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-history', data.home_id] })
    },
  })
}

export function useDeleteWorkEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; homeId: string }) => deleteWorkEntry(id),
    onSuccess: (_, { homeId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-history', homeId] })
    },
  })
}

// ===========================================================================
// HOME DOCUMENTS (Diagnostics obligatoires)
// ===========================================================================

export function useHomeDocuments(homeId: string | undefined) {
  return useQuery({
    queryKey: ['home-documents', homeId],
    queryFn: () => fetchDocumentsByHome(homeId!),
    enabled: !!homeId,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HomeDocumentInsert) => createDocument(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['home-documents', data.home_id] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HomeDocumentUpdate }) =>
      updateDocument(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['home-documents', data.home_id] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; homeId: string }) => deleteDocument(id),
    onSuccess: (_, { homeId }) => {
      queryClient.invalidateQueries({ queryKey: ['home-documents', homeId] })
    },
  })
}

// ===========================================================================
// PARTNER PLATFORM — COMPANIES
// ===========================================================================

import {
  fetchMyCompany,
  fetchCompanyById,
  fetchAllCompanies,
  updateCompany,
  fetchCompanyDashboardStats,
} from '@/api/companies'
import type { CompanyUpdate } from '@/api/companies'
import {
  fetchCompanyProspects,
  fetchAllProspects,
  fetchProspectById,
  createProspect,
  updateProspect,
  deleteProspect,
  fetchCompanyProspectStats,
} from '@/api/prospects'
import type { ProspectInsert, ProspectUpdate as ProspectUpdateType } from '@/api/prospects'
import type { ProspectStatus } from '@/types/partner'
import {
  fetchCompanyMembers,
  inviteMember,
  removeMember,
} from '@/api/company-members'

export function useMyCompany(userId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'my', userId],
    queryFn: () => fetchMyCompany(userId!),
    enabled: !!userId,
  })
}

export function useCompanyDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'detail', id],
    queryFn: () => fetchCompanyById(id!),
    enabled: !!id,
  })
}

export function useAdminCompanies(page: number) {
  return useQuery({
    queryKey: ['companies', 'admin', page],
    queryFn: () => fetchAllCompanies(page),
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompanyUpdate }) =>
      updateCompany(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.setQueryData(['companies', 'detail', data.id], data)
    },
  })
}

export function useCompanyDashboardStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'stats', companyId],
    queryFn: () => fetchCompanyDashboardStats(companyId!),
    enabled: !!companyId,
  })
}

// ===========================================================================
// PARTNER PLATFORM — PROSPECTS
// ===========================================================================

export function useCompanyProspects(companyId: string | undefined, page: number, status?: ProspectStatus) {
  return useQuery({
    queryKey: ['prospects', 'company', companyId, page, status],
    queryFn: () => fetchCompanyProspects(companyId!, page, status),
    enabled: !!companyId,
  })
}

export function useAdminAllProspects(page: number, status?: ProspectStatus) {
  return useQuery({
    queryKey: ['prospects', 'admin', page, status],
    queryFn: () => fetchAllProspects(page, status),
  })
}

export function useProspectDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'detail', id],
    queryFn: () => fetchProspectById(id!),
    enabled: !!id,
  })
}

export function useCreateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProspectInsert) => createProspect(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
    },
  })
}

export function useUpdateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProspectUpdateType }) =>
      updateProspect(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.setQueryData(['prospects', 'detail', data.id], data)
    },
  })
}

export function useDeleteProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProspect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
    },
  })
}

export function useCompanyProspectStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'stats', companyId],
    queryFn: () => fetchCompanyProspectStats(companyId!),
    enabled: !!companyId,
  })
}

// ===========================================================================
// PARTNER PLATFORM — COMPANY MEMBERS
// ===========================================================================

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-members', companyId],
    queryFn: () => fetchCompanyMembers(companyId!),
    enabled: !!companyId,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, email }: { companyId: string; email: string }) =>
      inviteMember(companyId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] })
    },
  })
}

// ===========================================================================
// PARTNER PLATFORM — QUOTES
// ===========================================================================

import {
  fetchAllQuotes,
  createQuote,
  updateQuoteCommissionStatus,
} from '@/api/quotes'
import type { QuoteInsert } from '@/api/quotes'
import type { CommissionStatus } from '@/types/partner'

export function useAdminQuotes(page: number, commissionStatus?: CommissionStatus) {
  return useQuery({
    queryKey: ['quotes', 'admin', page, commissionStatus],
    queryFn: () => fetchAllQuotes(page, commissionStatus),
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuoteInsert) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, paidAt }: { id: string; status: CommissionStatus; paidAt?: string | null }) =>
      updateQuoteCommissionStatus(id, status, paidAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

// ===========================================================================
// PARTNER PLATFORM — AFFILIATES
// ===========================================================================

import {
  fetchMyAffiliate,
  fetchAllAffiliates,
  fetchAffiliateProspects,
  fetchPointsHistory,
} from '@/api/affiliates'

export function useMyAffiliate(userId: string | undefined) {
  return useQuery({
    queryKey: ['affiliates', 'my', userId],
    queryFn: () => fetchMyAffiliate(userId!),
    enabled: !!userId,
  })
}

export function useAdminAffiliates(page: number) {
  return useQuery({
    queryKey: ['affiliates', 'admin', page],
    queryFn: () => fetchAllAffiliates(page),
  })
}

export function useAffiliateProspects(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['prospects', 'affiliate', affiliateId],
    queryFn: () => fetchAffiliateProspects(affiliateId!),
    enabled: !!affiliateId,
  })
}

export function usePointsHistory(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['points', 'history', affiliateId],
    queryFn: () => fetchPointsHistory(affiliateId!),
    enabled: !!affiliateId,
  })
}

// ===========================================================================
// PARTNER PLATFORM — REWARDS
// ===========================================================================

import {
  fetchRewardsCatalog,
  createReward,
  updateReward,
  fetchMyClaims,
  createRewardClaim,
  fetchAllClaims,
  updateClaimStatus,
} from '@/api/rewards'
import type { RewardInsert, RewardUpdate as RewardUpdateType } from '@/api/rewards'

export function useRewardsCatalog(activeOnly = true) {
  return useQuery({
    queryKey: ['rewards', 'catalog', activeOnly],
    queryFn: () => fetchRewardsCatalog(activeOnly),
  })
}

export function useCreateReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RewardInsert) => createReward(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })
}

export function useUpdateReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RewardUpdateType }) =>
      updateReward(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })
}

export function useMyClaims(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ['rewards', 'claims', affiliateId],
    queryFn: () => fetchMyClaims(affiliateId!),
    enabled: !!affiliateId,
  })
}

export function useCreateRewardClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      affiliateId,
      rewardId,
      pointsSpent,
      shippingAddress,
    }: {
      affiliateId: string
      rewardId: string
      pointsSpent: number
      shippingAddress?: string
    }) => createRewardClaim(affiliateId, rewardId, pointsSpent, shippingAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    },
  })
}

export function useAdminClaims() {
  return useQuery({
    queryKey: ['rewards', 'claims', 'admin'],
    queryFn: fetchAllClaims,
  })
}

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      updateClaimStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })
}

// ===========================================================================
// PARTNER PLATFORM — SOCIAL POSTS
// ===========================================================================

import {
  fetchMySocialPosts,
  fetchAllSocialPosts,
  createSocialPost,
  updateSocialPostStatus,
  getMonthlyPostCount,
} from '@/api/social-posts'
import type { SocialPostInsert } from '@/api/social-posts'

export function useMySocialPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['social-posts', 'my', userId],
    queryFn: () => fetchMySocialPosts(userId!),
    enabled: !!userId,
  })
}

export function useAdminSocialPosts(page: number, status?: string) {
  return useQuery({
    queryKey: ['social-posts', 'admin', page, status],
    queryFn: () => fetchAllSocialPosts(page, status),
  })
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SocialPostInsert) => createSocialPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] })
    },
  })
}

export function useUpdateSocialPostStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
      adminNotes,
    }: {
      id: string
      status: string
      rejectionReason?: string | null
      adminNotes?: string | null
    }) => updateSocialPostStatus(id, status, rejectionReason, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] })
    },
  })
}

export function useMonthlyPostCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['social-posts', 'monthly-count', userId],
    queryFn: () => getMonthlyPostCount(userId!),
    enabled: !!userId,
  })
}

// ===========================================================================
// PARTNER PLATFORM — RECRUITMENT
// ===========================================================================

import { fetchMyRecruitTree, fetchNetworkStats, fetchMyRecruitmentCommissions } from '@/api/recruitment'

export function useMyRecruitTree(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'tree', recruiterId],
    queryFn: () => fetchMyRecruitTree(recruiterId!),
    enabled: !!recruiterId,
  })
}

export function useNetworkStats(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'stats', recruiterId],
    queryFn: () => fetchNetworkStats(recruiterId!),
    enabled: !!recruiterId,
  })
}

export function useMyRecruitmentCommissions(recruiterId: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'commissions', recruiterId],
    queryFn: () => fetchMyRecruitmentCommissions(recruiterId!),
    enabled: !!recruiterId,
  })
}
