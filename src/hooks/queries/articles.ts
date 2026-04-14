import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllArticles,
  fetchPublishedArticles,
  fetchArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleArticlePublished,
} from '@/api/articles'
import type { Database } from '@/types/database'

type ArticleInsert = Database['public']['Tables']['brh_articles']['Insert']
type ArticleUpdate = Database['public']['Tables']['brh_articles']['Update']

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
