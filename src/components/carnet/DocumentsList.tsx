import { logError } from '@/lib/error'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, FileText, AlertTriangle, CheckCircle2, Clock, X, Save, Upload, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatLocalDate } from '@/lib/utils'
import type { BrhHomeDocumentRow, DocumentType } from '@/types/database'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_VALIDITY_YEARS } from '@/data/constants'

function getExpirationStatus(expiresAt: string | null): 'valid' | 'expiring' | 'expired' | 'unknown' {
  if (!expiresAt) return 'unknown'
  const now = new Date()
  const exp = new Date(expiresAt)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'expired'
  if (diffDays < 90) return 'expiring'
  return 'valid'
}

const STATUS_BADGE = {
  valid: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle2, label: 'Valide' },
  expiring: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock, label: 'Expire bientot' },
  expired: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle, label: 'Expire' },
  unknown: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: FileText, label: 'Sans expiration' },
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp'

interface FormState {
  doc_type: DocumentType
  title: string
  issued_at: string
  expires_at: string
  notes: string
}

const EMPTY_FORM: FormState = { doc_type: 'dpe', title: '', issued_at: '', expires_at: '', notes: '' }

interface Props {
  documents: BrhHomeDocumentRow[]
  homeId: string
  userId: string
  onCreate: (doc: { home_id: string; user_id: string; doc_type: DocumentType; title: string; file_url: string | null; issued_at: string | null; expires_at: string | null; notes: string | null }) => void
  onUpdate: (id: string, payload: Partial<BrhHomeDocumentRow>) => void
  onDelete: (id: string) => void
}

export function DocumentsList({ documents, homeId, userId, onCreate, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function autoExpires(docType: DocumentType, issuedAt: string): string {
    const years = DOCUMENT_VALIDITY_YEARS[docType]
    if (!years || !issuedAt) return ''
    const d = new Date(issuedAt)
    d.setFullYear(d.getFullYear() + Math.floor(years))
    if (years % 1 !== 0) d.setMonth(d.getMonth() + Math.round((years % 1) * 12))
    return formatLocalDate(d)
  }

  async function uploadFile(f: File): Promise<string | null> {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const path = `${userId}/${homeId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('home-documents')
      .upload(path, f, { contentType: f.type, upsert: false })

    if (error) {
      logError('Upload error', error)
      setUploadError('Erreur lors du telechargement du fichier.')
      return null
    }

    const { data: urlData } = supabase.storage
      .from('home-documents')
      .getPublicUrl(path)

    // Pour un bucket prive, on utilise createSignedUrl
    const { data: signedData } = await supabase.storage
      .from('home-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 an

    return signedData?.signedUrl ?? urlData.publicUrl ?? path
  }

  async function handleDownload(fileUrl: string, _title?: string) {
    // Si c'est un path storage (pas une URL signee), creer une URL signee
    if (!fileUrl.startsWith('http')) {
      const { data } = await supabase.storage
        .from('home-documents')
        .createSignedUrl(fileUrl, 60 * 5) // 5 min
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
        return
      }
    }
    window.open(fileUrl, '_blank')
  }

  async function handleSubmit() {
    if (!form.title.trim()) return
    setUploadError(null)
    setUploading(true)

    let fileUrl: string | null = null

    if (file) {
      fileUrl = await uploadFile(file)
      if (!fileUrl && file) {
        setUploading(false)
        return
      }
    }

    const payload = {
      home_id: homeId,
      user_id: userId,
      doc_type: form.doc_type,
      title: form.title.trim(),
      file_url: fileUrl,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      notes: form.notes.trim() || null,
    }

    if (editingId) {
      onUpdate(editingId, fileUrl ? payload : { ...payload, file_url: undefined })
      setEditingId(null)
    } else {
      onCreate(payload)
      setShowForm(false)
    }
    setForm(EMPTY_FORM)
    setFile(null)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function startEdit(doc: BrhHomeDocumentRow) {
    setEditingId(doc.id)
    setForm({
      doc_type: doc.doc_type,
      title: doc.title,
      issued_at: doc.issued_at ?? '',
      expires_at: doc.expires_at ?? '',
      notes: doc.notes ?? '',
    })
    setFile(null)
    setShowForm(false)
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function renderForm() {
    return (
      <div className="bg-surface rounded-2xl border border-primary/20 p-5 space-y-4 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Type</label>
            <select
              value={form.doc_type}
              onChange={(e) => {
                const dt = e.target.value as DocumentType
                setForm((p) => ({
                  ...p,
                  doc_type: dt,
                  title: p.title || DOCUMENT_TYPE_LABELS[dt],
                  expires_at: p.issued_at ? autoExpires(dt, p.issued_at) : p.expires_at,
                }))
              }}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            >
              {DOCUMENT_TYPES.map((dt) => <option key={dt} value={dt}>{DOCUMENT_TYPE_LABELS[dt]}</option>)}
            </select>
          </div>
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: DPE 2024"
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors placeholder:text-text-light"
            />
          </div>
        </div>

        {/* Upload fichier */}
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Document (PDF, JPG, PNG)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-light rounded-xl bg-background cursor-pointer hover:border-primary transition-colors">
              <Upload size={16} className="text-text-light shrink-0" />
              <span className="font-body text-sm text-text-light truncate">
                {file ? file.name : 'Choisir un fichier...'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    if (f.size > 10 * 1024 * 1024) {
                      setUploadError('Le fichier ne doit pas depasser 10 Mo.')
                      return
                    }
                    setFile(f)
                    setUploadError(null)
                  }
                }}
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X size={14} className="text-red-400" />
              </button>
            )}
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 mt-1 font-body">{uploadError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Date d'emission</label>
            <input
              type="date"
              value={form.issued_at}
              onChange={(e) => {
                const v = e.target.value
                setForm((p) => ({ ...p, issued_at: v, expires_at: autoExpires(p.doc_type, v) || p.expires_at }))
              }}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Date d'expiration</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Observations..."
            className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors resize-none placeholder:text-text-light"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {uploading ? 'Envoi...' : editingId ? 'Modifier' : 'Ajouter'}
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2.5 border border-gray-light text-text-light font-display text-sm rounded-xl hover:bg-background transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-text-light">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>

      {showForm && renderForm()}

      {documents.length === 0 && !showForm ? (
        <div className="bg-surface rounded-2xl border border-gray-light p-8 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="font-display text-sm text-text-primary">Aucun document</p>
          <p className="font-body text-xs text-text-light mt-1">Ajoutez vos diagnostics obligatoires (DPE, amiante, plomb...)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc) => {
            if (editingId === doc.id) return <div key={doc.id} className="sm:col-span-2">{renderForm()}</div>

            const status = getExpirationStatus(doc.expires_at)
            const badge = STATUS_BADGE[status]
            const BadgeIcon = badge.icon

            return (
              <div key={doc.id} className={`rounded-2xl border p-4 ${badge.bg} ${badge.border} transition-colors`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-xs text-text-light uppercase tracking-wider">
                        {DOCUMENT_TYPE_LABELS[doc.doc_type]}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-display ${badge.text}`}>
                        <BadgeIcon size={10} /> {badge.label}
                      </span>
                    </div>
                    <p className="font-display text-sm text-text-primary">{doc.title}</p>
                    {doc.issued_at && (
                      <p className="font-body text-xs text-text-light mt-1">
                        Emis le {new Date(doc.issued_at).toLocaleDateString('fr-FR')}
                        {doc.expires_at && ` — Expire le ${new Date(doc.expires_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}
                    {doc.notes && <p className="font-body text-xs text-text-secondary mt-1">{doc.notes}</p>}

                    {/* Lien telechargement si fichier attache */}
                    {doc.file_url && (
                      <button
                        type="button"
                        onClick={() => void handleDownload(doc.file_url!, doc.title)}
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-body text-primary hover:underline"
                      >
                        <Download size={12} /> Telecharger le document
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(doc)} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                      <Pencil size={14} className="text-text-light" />
                    </button>
                    <button type="button" onClick={() => onDelete(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
