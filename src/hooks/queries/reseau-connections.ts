/**
 * Phase 18.5 — Hooks React Query pour graphe social `/reseau/connexions`.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauConnectionsApi } from '@/api/reseau-connections'

export const RESEAU_CONNECTIONS_KEY = ['reseau-connections'] as const

export function useMyConnections() {
  return useQuery({
    queryKey: [...RESEAU_CONNECTIONS_KEY, 'accepted'] as const,
    queryFn: () => reseauConnectionsApi.listAccepted(),
    staleTime: 60_000,
  })
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: [...RESEAU_CONNECTIONS_KEY, 'incoming'] as const,
    queryFn: () => reseauConnectionsApi.listIncoming(),
    staleTime: 30_000,
  })
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: [...RESEAU_CONNECTIONS_KEY, 'outgoing'] as const,
    queryFn: () => reseauConnectionsApi.listOutgoing(),
    staleTime: 30_000,
  })
}

export function useConnectionSuggestions(limit = 10) {
  return useQuery({
    queryKey: [...RESEAU_CONNECTIONS_KEY, 'suggestions', limit] as const,
    queryFn: () => reseauConnectionsApi.suggestions(limit),
    staleTime: 5 * 60_000,
  })
}

export function useSendConnectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recipientProId, message }: { recipientProId: string; message?: string }) =>
      reseauConnectionsApi.send(recipientProId, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_CONNECTIONS_KEY })
    },
  })
}

export function useAcceptConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => reseauConnectionsApi.accept(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_CONNECTIONS_KEY })
    },
  })
}

export function useDeclineConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => reseauConnectionsApi.decline(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_CONNECTIONS_KEY })
    },
  })
}
