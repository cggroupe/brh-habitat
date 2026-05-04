/**
 * Hooks React Query — prospect-letters (Phase 13).
 * Pair volontaire avec src/api/prospect-letters.ts.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prospectLettersApi, type ProspectLetterRow } from '@/api/prospect-letters'

export const PROSPECT_LETTERS_KEY = ['prospect-letters'] as const

export function useGenerateLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prospectId: number) => prospectLettersApi.generate(prospectId),
    onSuccess: (_, prospectId) => {
      qc.invalidateQueries({ queryKey: [...PROSPECT_LETTERS_KEY, 'prospect', prospectId] })
    },
  })
}

export function useLettersByProspect(prospectId: number | null | undefined) {
  return useQuery({
    queryKey: [...PROSPECT_LETTERS_KEY, 'prospect', prospectId] as const,
    queryFn: () => prospectLettersApi.listByProspect(prospectId!),
    enabled: !!prospectId,
  })
}

export function useLetter(id: string | undefined) {
  return useQuery({
    queryKey: [...PROSPECT_LETTERS_KEY, 'detail', id] as const,
    queryFn: () => prospectLettersApi.get(id!),
    enabled: !!id,
  })
}

export function useUpdateLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<ProspectLetterRow, 'subject' | 'body_md' | 'greeting' | 'signature' | 'status' | 'sent_via'>>
    }) => prospectLettersApi.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...PROSPECT_LETTERS_KEY, 'detail', data.id] })
      qc.invalidateQueries({ queryKey: [...PROSPECT_LETTERS_KEY, 'prospect', data.prospect_id] })
    },
  })
}

export function useArchiveLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => prospectLettersApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROSPECT_LETTERS_KEY })
    },
  })
}
