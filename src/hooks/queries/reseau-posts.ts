/**
 * Phase 18.6 — Hooks React Query pour posts du fil `/reseau`.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauPostsApi, type ListFeedFilters, type FeedPostType, type FeedVisibility } from '@/api/reseau-posts'

export const RESEAU_POSTS_KEY = ['reseau-posts'] as const

export function useFeedPosts(filters: ListFeedFilters = {}) {
  return useQuery({
    queryKey: [...RESEAU_POSTS_KEY, 'list', filters] as const,
    queryFn: () => reseauPostsApi.list(filters),
    staleTime: 60_000,
  })
}

export function useFeedPost(id: string | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_POSTS_KEY, 'detail', id] as const,
    queryFn: () => reseauPostsApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useMyPostsCount24h() {
  return useQuery({
    queryKey: [...RESEAU_POSTS_KEY, 'count-24h'] as const,
    queryFn: () => reseauPostsApi.myPostsCount24h(),
    staleTime: 30_000,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      post_type: FeedPostType
      body?: string
      metiers_tags?: string[]
      region_codes?: string[]
      visibility?: FeedVisibility
    }) => reseauPostsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_POSTS_KEY })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reseauPostsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_POSTS_KEY })
    },
  })
}
