/**
 * Phase 18.6 — Hooks React Query pour réactions (like / recommande / expert).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauReactionsApi, type ReactionType } from '@/api/reseau-reactions'
import { RESEAU_POSTS_KEY } from '@/hooks/queries/reseau-posts'

export const RESEAU_REACTIONS_KEY = ['reseau-reactions'] as const

export function useMyReactionsForPosts(postIds: string[]) {
  const sortedIds = [...postIds].sort()
  return useQuery({
    queryKey: [...RESEAU_REACTIONS_KEY, 'mine', sortedIds] as const,
    queryFn: () => reseauReactionsApi.myReactionsForPosts(postIds),
    enabled: postIds.length > 0,
    staleTime: 60_000,
  })
}

export function useToggleReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      reactionType = 'like',
    }: {
      postId: string
      reactionType?: ReactionType
    }) => reseauReactionsApi.toggle(postId, reactionType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_REACTIONS_KEY })
      qc.invalidateQueries({ queryKey: RESEAU_POSTS_KEY })
    },
  })
}
