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
} from '@/api/cases'
import {
  fetchUserAppointments,
  fetchAppointments,
  createAppointment,
  updateAppointment,
} from '@/api/appointments'
import {
  fetchUserDiagnostics,
  fetchDiagnostics,
  fetchDiagnosticById,
  createDiagnostic,
  updateDiagnosticStatus,
  fetchUserDraftDiagnostic,
  fetchUserCompletedDiagnostics,
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
import { createContact } from '@/api/contacts'
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
import type { DiagnosticStatus, CaseStatus, UserRole } from '@/types/database'
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
    mutationFn: (id: string) => deleteHealthRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records'] })
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
    mutationFn: (id: string) => deleteWorkEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-history'] })
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
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-documents'] })
    },
  })
}
