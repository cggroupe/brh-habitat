import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import type { Database } from '@/types/database'

type HealthRecordInsert = Database['public']['Tables']['brh_health_records']['Insert']
type WorkHistoryInsert = Database['public']['Tables']['brh_work_history']['Insert']
type WorkHistoryUpdate = Database['public']['Tables']['brh_work_history']['Update']
type HomeDocumentInsert = Database['public']['Tables']['brh_home_documents']['Insert']
type HomeDocumentUpdate = Database['public']['Tables']['brh_home_documents']['Update']

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
