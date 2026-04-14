import { X, AlertCircle } from 'lucide-react'
import { ARTICLE_CATEGORIES } from '@/data/constants'
import type { ArticleFormData } from './articleFormTypes'

interface ArticleFormModalProps {
  editingId: string | null
  form: ArticleFormData
  formError: string | null
  saving: boolean
  onClose: () => void
  onFieldChange: (field: keyof ArticleFormData, value: string | boolean) => void
  onSubmit: () => void
}

const inputCls =
  'w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-light'

export function ArticleFormModal({
  editingId,
  form,
  formError,
  saving,
  onClose,
  onFieldChange,
  onSubmit,
}: ArticleFormModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-8 bg-black/50 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-gray-light w-full max-w-2xl my-auto shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light">
          <h2 className="font-display text-lg text-text-primary">
            {editingId ? "Modifier l'article" : 'Nouvel article'}
          </h2>
          <button
            onClick={onClose}
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
                onChange={(e) => onFieldChange('title', e.target.value)}
                placeholder="Titre de l'article"
                className={inputCls}
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
                onChange={(e) => onFieldChange('slug', e.target.value)}
                placeholder="url-de-l-article"
                className={`${inputCls} font-mono`}
              />
            </div>

            {/* Excerpt */}
            <div className="sm:col-span-2">
              <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                Extrait *
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => onFieldChange('excerpt', e.target.value)}
                rows={2}
                placeholder="Courte description de l'article..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Content */}
            <div className="sm:col-span-2">
              <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                Contenu *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => onFieldChange('content', e.target.value)}
                rows={8}
                placeholder="Contenu de l'article (Markdown supporté)..."
                className={`${inputCls} resize-y font-mono`}
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) => onFieldChange('category', e.target.value)}
                className={inputCls}
              >
                {ARTICLE_CATEGORIES.map((c) => (
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
                onChange={(e) => onFieldChange('author', e.target.value)}
                placeholder="Nom de l'auteur"
                className={inputCls}
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
                onChange={(e) => onFieldChange('tags', e.target.value)}
                placeholder="isolation, renovation, energie"
                className={inputCls}
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
                onChange={(e) => onFieldChange('cover_image', e.target.value)}
                placeholder="https://..."
                className={inputCls}
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
                onChange={(e) => onFieldChange('read_time', e.target.value)}
                placeholder="5"
                min="1"
                className={inputCls}
              />
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onFieldChange('published', !form.published)}
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
              <label
                className="font-body text-sm text-text-primary cursor-pointer"
                onClick={() => onFieldChange('published', !form.published)}
              >
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
                  onChange={(e) => onFieldChange('seo_title', e.target.value)}
                  placeholder="Titre SEO..."
                  className={inputCls}
                />
                <textarea
                  value={form.seo_description}
                  onChange={(e) => onFieldChange('seo_description', e.target.value)}
                  rows={2}
                  placeholder="Description SEO..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-gray-light flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Sauvegarde...' : (editingId ? 'Enregistrer' : "Créer l'article")}
          </button>
        </div>
      </div>
    </div>
  )
}
