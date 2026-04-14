import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createContact, fetchContacts, updateContactStatus } from '@/api/contacts'
import type { ContactStatus } from '@/types/database'
import type { Database } from '@/types/database'

type ContactInsert = Database['public']['Tables']['brh_contacts']['Insert']

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
