import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhArticleRow } from '@/types/database'

const PAGE_SIZE = 20

const CATEGORIES = [
  'Rénovation énergétique',
  'Isolation',
  'Toiture',
  'Humidité',
  'Chauffage',
  'Ventilation',
  'Menuiseries',
  'Électricité',
  'Aides & subventions',
  'Diagnostic',
  'Guide pratique',
]

interface ArticleFormData {
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

const emptyForm: ArticleFormData = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: CATEGORIES[0],
  tags: '',
  author: '',
  cover_image: '',
  seo_title: '',
  seo_description: '',
  read_time: '',
  published: false,
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<BrhArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleFormData>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, count, error: fetchError } = await supabase
      .from('brh_articles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (fetchError) {
      setError('Erreur lors du chargement des articles.')
      setLoading(false)
      return
    }

    setArticles(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => {
    void fetchArticles()
  }, [fetchArticles])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(article: BrhArticleRow) {
    setEditingId(article.id)
    setForm({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      tags: article.tags.join(', '),
      author: article.author,
      cover_image: article.cover_image ?? '',
      seo_title: article.seo_title ?? '',
      seo_description: article.seo_description ?? '',
      read_time: article.read_time != null ? String(article.read_time) : '',
      published: article.published,
    })
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  function updateForm(field: keyof ArticleFormData, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-generate slug from title when creating
      if (field === 'title' && !editingId) {
        next.slug = slugify(value as string)
      }
      return next
    })
  }

  async function handleSubmit() {
    setFormError(null)
    if (!form.title.trim()) { setFormError('Le titre est requis.'); return }
    if (!form.slug.trim()) { setFormError('Le slug est requis.'); return }
    if (!form.excerpt.trim()) { setFormError("L'extrait est requis."); return }
    if (!form.content.trim()) { setFormError('Le contenu est requis.'); return }
    if (!form.author.trim()) { setFormError("L'auteur est requis."); return }

    setFormSaving(true)

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      author: form.author.trim(),
      cover_image: form.cover_image.trim() || null,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      read_time: form.read_time ? parseInt(form.read_time, 10) : null,
      published: form.published,
      updated_at: new Date().toISOString(),
    }

    let opError: { message: string } | null = null

    if (editingId) {
      const { error } = await supabase
        .from('brh_articles')
        .update(payload)
        .eq('id', editingId)
      opError = error
    } else {
      const { error } = await supabase
        .from('brh_articles')
        .insert(payload)
      opError = error
    }

    setFormSaving(false)

    if (opError) {
      setFormError(opError.message ?? "Erreur lors de l'enregistrement.")
      return
    }

    closeModal()
    void fetchArticles()
  }

  async function togglePublished(article: BrhArticleRow) {
    setTogglingId(article.id)
    const { error } = await supabase
      .from('brh_articles')
      .update({ published: !article.published, updated_at: new Date().toISOString() })
      .eq('id', article.id)

    if (!error) {
      setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, published: !a.published } : a))
    }
    setTogglingId(null)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await supabase.from('brh_articles').delete().eq('id', id)
    setDeleteConfirmId(null)
    setDeleting(false)
    void fetchArticles()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Articles</h1>
          <p className="font-body text-sm text-text-light mt-1">{total} article{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Nouvel article
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary mb-1">Aucun article pour le moment</p>
            <button onClick={openCreate} className="text-primary font-body text-sm hover:underline mt-1">
              Créer le premier article
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-light">
                  <tr>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Titre</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Catégorie</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Auteur</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Lecture</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Publié</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-b border-gray-light last:border-0 hover:bg-background transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-body text-sm text-text-primary font-medium max-w-[240px] truncate">{article.title}</p>
                        <p className="font-body text-xs text-text-light">{article.slug}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-block px-2.5 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">
                          {article.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">{article.author}</td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {article.read_time ? `${article.read_time} min` : '—'}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                        {new Date(article.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => void togglePublished(article)}
                          disabled={togglingId === article.id}
                          aria-label={article.published ? 'Dépublier' : 'Publier'}
                          className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                            article.published ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5 ${
                              article.published ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(article)}
                            className="p-1.5 rounded-lg text-text-light hover:text-primary hover:bg-green-50 transition-colors"
                            aria-label="Modifier"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(article.id)}
                            className="p-1.5 rounded-lg text-text-light hover:text-danger hover:bg-red-50 transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-light">
                <p className="font-body text-sm text-text-light">
                  Page {page + 1} sur {totalPages} — {total} résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/50 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-gray-light w-full max-w-2xl my-auto shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light">
              <h2 className="font-display text-lg text-text-primary">
                {editingId ? 'Modifier l\'article' : 'Nouvel article'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-background transition-colors text-text-light"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-danger font-body text-sm">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder="Titre de l'article"
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                  />
                </div>

                {/* Slug */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateForm('slug', e.target.value)}
                    placeholder="url-de-l-article"
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light font-mono"
                  />
                </div>

                {/* Excerpt */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Extrait *
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => updateForm('excerpt', e.target.value)}
                    rows={2}
                    placeholder="Courte description de l'article..."
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary resize-none placeholder:text-text-light"
                  />
                </div>

                {/* Content */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Contenu *
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => updateForm('content', e.target.value)}
                    rows={8}
                    placeholder="Contenu de l'article (Markdown supporté)..."
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary resize-y placeholder:text-text-light font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateForm('category', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Author */}
                <div>
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Auteur *
                  </label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => updateForm('author', e.target.value)}
                    placeholder="Nom de l'auteur"
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                  />
                </div>

                {/* Tags */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => updateForm('tags', e.target.value)}
                    placeholder="isolation, renovation, energie"
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                  />
                </div>

                {/* Cover image */}
                <div className="sm:col-span-2">
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    URL de l'image de couverture
                  </label>
                  <input
                    type="url"
                    value={form.cover_image}
                    onChange={(e) => updateForm('cover_image', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                  />
                </div>

                {/* Read time */}
                <div>
                  <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                    Temps de lecture (min)
                  </label>
                  <input
                    type="number"
                    value={form.read_time}
                    onChange={(e) => updateForm('read_time', e.target.value)}
                    placeholder="5"
                    min="1"
                    className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                  />
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateForm('published', !form.published)}
                    className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 ${
                      form.published ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5 ${
                        form.published ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <label className="font-body text-sm text-text-primary cursor-pointer" onClick={() => updateForm('published', !form.published)}>
                    {form.published ? 'Publié' : 'Brouillon'}
                  </label>
                </div>

                {/* SEO */}
                <div className="sm:col-span-2 border-t border-gray-light pt-4">
                  <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">SEO (optionnel)</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.seo_title}
                      onChange={(e) => updateForm('seo_title', e.target.value)}
                      placeholder="Titre SEO..."
                      className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light"
                    />
                    <textarea
                      value={form.seo_description}
                      onChange={(e) => updateForm('seo_description', e.target.value)}
                      rows={2}
                      placeholder="Description SEO..."
                      className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary resize-none placeholder:text-text-light"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-light flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={formSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {formSaving ? 'Sauvegarde...' : (editingId ? 'Enregistrer' : 'Créer l\'article')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-2xl border border-gray-light p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-danger" />
              </div>
              <h3 className="font-display text-base text-text-primary">Supprimer l'article</h3>
            </div>
            <p className="font-body text-sm text-text-secondary mb-5">
              Cette action est irréversible. L'article sera définitivement supprimé.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => void handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="px-4 py-2 bg-danger text-white font-display text-sm rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
