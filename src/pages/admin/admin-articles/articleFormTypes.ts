import { ARTICLE_CATEGORIES } from '@/data/constants'

export interface ArticleFormData {
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string
  author: string
  cover_image: string
  seo_title: string
  seo_description: string
  read_time: string
  published: boolean
}

export const emptyForm: ArticleFormData = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: ARTICLE_CATEGORIES[0],
  tags: '',
  author: '',
  cover_image: '',
  seo_title: '',
  seo_description: '',
  read_time: '',
  published: false,
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
