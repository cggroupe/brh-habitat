import { supabase } from '@/lib/supabase'
import type { BrhArticleRow, Database } from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type ArticleInsert = Database['public']['Tables']['brh_articles']['Insert']
type ArticleUpdate = Database['public']['Tables']['brh_articles']['Update']

export interface PaginatedArticles {
  data: BrhArticleRow[]
  count: number
  page: number
}

export async function fetchPublishedArticles(
  page = 0,
  category?: string,
): Promise<PaginatedArticles> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_articles')
    .select('*', { count: 'exact' })
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchAllArticles(page: number): Promise<PaginatedArticles> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('brh_articles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchArticleBySlug(slug: string): Promise<BrhArticleRow> {
  const { data, error } = await supabase
    .from('brh_articles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error

  return data
}

export async function createArticle(payload: ArticleInsert): Promise<BrhArticleRow> {
  const { data, error } = await supabase
    .from('brh_articles')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateArticle(
  id: string,
  payload: ArticleUpdate,
): Promise<BrhArticleRow> {
  const { data, error } = await supabase
    .from('brh_articles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_articles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function toggleArticlePublished(
  id: string,
  published: boolean,
): Promise<BrhArticleRow> {
  const { data, error } = await supabase
    .from('brh_articles')
    .update({ published })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
