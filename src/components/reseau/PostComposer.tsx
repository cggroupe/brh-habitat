/**
 * Phase 18.6 — Composer post `/reseau`.
 *
 * Inclut un éditeur Canvas inline pour le floutage manuel (décision #4).
 * Workflow :
 *   1. User saisit body, post_type, visibility, métiers, photos
 *   2. Pour chaque photo : éditeur ouvre, user dessine des rectangles à flouter,
 *      validation crée le `_public.jpg` floutée
 *   3. Submit : crée brh_feed_posts, upload (original + public), update media_urls
 *
 * Rate-limit V1 : 5 posts max / 24h (côté front, hard-cap UI).
 */
import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Send, X, Plus, ShieldAlert } from 'lucide-react'
import { useCreatePost, useMyPostsCount24h } from '@/hooks/queries/reseau-posts'
import { reseauPostsApi, type FeedPostType, type FeedVisibility } from '@/api/reseau-posts'
import { applyBlurZonesToBlob, loadImage, type BlurZone } from '@/lib/reseau/blur-canvas'

const POST_TYPES: { value: FeedPostType; label: string }[] = [
  { value: 'photo_chantier', label: 'Photo chantier' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'recommandation', label: 'Recommandation' },
  { value: 'question_metier', label: 'Question métier' },
  { value: 'recherche_partenaire', label: 'Recherche partenaire' },
  { value: 'annonce_chantier', label: 'Annonce de chantier' },
  { value: 'actu', label: 'Actualité' },
  { value: 'autre', label: 'Autre' },
]

const RATE_LIMIT_24H = 5

interface PendingMedia {
  id: string
  originalBlob: Blob
  publicBlob: Blob
  zones: BlurZone[]
  previewUrl: string
}

export default function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [postType, setPostType] = useState<FeedPostType>('photo_chantier')
  const [visibility, setVisibility] = useState<FeedVisibility>('public')
  const [metiersInput, setMetiersInput] = useState('')
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([])
  const [editingFile, setEditingFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCreatePost()
  const count24h = useMyPostsCount24h()
  const remaining = RATE_LIMIT_24H - (count24h.data ?? 0)

  function reset() {
    setOpen(false)
    setBody('')
    setPostType('photo_chantier')
    setVisibility('public')
    setMetiersInput('')
    setPendingMedia((prev) => {
      prev.forEach((m) => URL.revokeObjectURL(m.previewUrl))
      return []
    })
    setEditingFile(null)
    setError(null)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse (10 MB max).')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format non supporté (JPEG, PNG, WebP).')
      return
    }
    setError(null)
    setEditingFile(file)
    e.target.value = ''
  }

  async function handleBlurDone(blurredBlob: Blob, zones: BlurZone[]) {
    if (!editingFile) return
    const previewUrl = URL.createObjectURL(blurredBlob)
    const newMedia: PendingMedia = {
      id: crypto.randomUUID(),
      originalBlob: editingFile,
      publicBlob: blurredBlob,
      zones,
      previewUrl,
    }
    setPendingMedia((prev) => [...prev, newMedia])
    setEditingFile(null)
  }

  function removePendingMedia(id: string) {
    setPendingMedia((prev) => {
      const target = prev.find((m) => m.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((m) => m.id !== id)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (remaining <= 0) {
      setError(`Limite atteinte : ${RATE_LIMIT_24H} posts / 24h. Pro Premium V2 = 20.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const metiers = metiersInput
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)

      // 1) Crée le post (sans média)
      const post = await create.mutateAsync({
        post_type: postType,
        body: body.trim() || undefined,
        metiers_tags: metiers,
        visibility,
      })

      // 2) Upload chaque média (original + public floutée)
      const publicPaths: string[] = []
      const allZones: BlurZone[][] = []
      for (let i = 0; i < pendingMedia.length; i++) {
        const m = pendingMedia[i]
        const { publicPath } = await reseauPostsApi.uploadMedia({
          postId: post.id,
          index: i,
          originalBlob: m.originalBlob,
          publicBlob: m.publicBlob,
          blurZones: m.zones,
        })
        publicPaths.push(publicPath)
        allZones.push(m.zones)
      }

      // 3) Update post avec media_urls + blur_zones
      if (publicPaths.length > 0) {
        await reseauPostsApi.setMedia(post.id, publicPaths, allZones)
      }

      reset()
      onPosted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la publication.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200 px-5 py-4 text-left text-slate-500 hover:border-cyan-300 hover:bg-cyan-50/30 transition flex items-center gap-3"
      >
        <Plus size={18} className="text-cyan-600" />
        <span className="text-sm">Partager un chantier, une réalisation, une question…</span>
      </button>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nouveau post</h3>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Annuler">
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as FeedPostType)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {POST_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Visibilité</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as FeedVisibility)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="public">Public</option>
                <option value="reseau">Mon réseau seulement</option>
                <option value="prive">Privé (moi seul)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="Ex: « Couverture neuve, ardoise naturelle, secteur Quimper, prévue septembre. »"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">{body.length} / 2000</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Métiers (tags, séparés par virgules)
            </label>
            <input
              type="text"
              value={metiersInput}
              onChange={(e) => setMetiersInput(e.target.value)}
              placeholder="couverture, zinguerie"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Pending media previews */}
          {pendingMedia.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pendingMedia.map((m) => (
                <div key={m.id} className="relative group rounded-lg overflow-hidden bg-slate-100">
                  <img src={m.previewUrl} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingMedia(m.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition"
                    aria-label="Retirer"
                  >
                    <X size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-slate-900/70 text-white px-1.5 rounded">
                    {m.zones.length} zone{m.zones.length > 1 ? 's' : ''} floutée{m.zones.length > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add photo */}
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-cyan-300 cursor-pointer text-slate-500 hover:text-cyan-700 transition">
            <ImageIcon size={16} />
            <span className="text-sm font-medium">Ajouter une photo (floutage manuel)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              Reste {remaining} / {RATE_LIMIT_24H} posts aujourd'hui
            </p>
            <button
              type="submit"
              disabled={submitting || remaining <= 0 || (!body.trim() && pendingMedia.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
            >
              <Send size={14} />
              {submitting ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal éditeur de floutage */}
      {editingFile && (
        <BlurEditorModal
          file={editingFile}
          onCancel={() => setEditingFile(null)}
          onDone={handleBlurDone}
        />
      )}
    </>
  )
}

/* ============================================================================
   BlurEditorModal — éditeur Canvas inline
   ============================================================================ */

function BlurEditorModal({
  file,
  onCancel,
  onDone,
}: {
  file: File
  onCancel: () => void
  onDone: (publicBlob: Blob, zones: BlurZone[]) => Promise<void> | void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [zones, setZones] = useState<BlurZone[]>([])
  const [drawing, setDrawing] = useState<BlurZone | null>(null)
  const [scale, setScale] = useState(1) // canvas displayed at scaled size
  const [working, setWorking] = useState(false)

  // Charge l'image au mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const img = await loadImage(file)
        if (cancelled) return
        imageRef.current = img
        const canvas = canvasRef.current
        if (!canvas) return
        // Limite displayed size à 600px max (canvas internal stays natural for blur quality)
        const maxDisplay = 600
        const displayScale = Math.min(1, maxDisplay / img.naturalWidth)
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.style.width = `${img.naturalWidth * displayScale}px`
        canvas.style.height = `${img.naturalHeight * displayScale}px`
        setScale(displayScale)
        redraw([])
      } catch {
        onCancel()
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  function redraw(currentZones: BlurZone[], preview?: BlurZone | null) {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    // Existing zones : rectangle bleu translucide
    ctx.strokeStyle = '#06b6d4'
    ctx.fillStyle = 'rgba(6, 182, 212, 0.20)'
    ctx.lineWidth = 3
    for (const z of currentZones) {
      ctx.fillRect(z.x, z.y, z.w, z.h)
      ctx.strokeRect(z.x, z.y, z.w, z.h)
    }
    if (preview) {
      ctx.strokeStyle = '#0891b2'
      ctx.fillStyle = 'rgba(8, 145, 178, 0.15)'
      ctx.fillRect(preview.x, preview.y, preview.w, preview.h)
      ctx.strokeRect(preview.x, preview.y, preview.w, preview.h)
    }
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointFromEvent(e)
    setDrawing({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const p = pointFromEvent(e)
    const next: BlurZone = {
      x: Math.min(drawing.x, p.x),
      y: Math.min(drawing.y, p.y),
      w: Math.abs(p.x - drawing.x),
      h: Math.abs(p.y - drawing.y),
    }
    redraw(zones, next)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const p = pointFromEvent(e)
    const final: BlurZone = {
      x: Math.min(drawing.x, p.x),
      y: Math.min(drawing.y, p.y),
      w: Math.abs(p.x - drawing.x),
      h: Math.abs(p.y - drawing.y),
    }
    setDrawing(null)
    if (final.w < 10 || final.h < 10) {
      redraw(zones)
      return
    }
    const next = [...zones, final]
    setZones(next)
    redraw(next)
  }

  function undoLast() {
    const next = zones.slice(0, -1)
    setZones(next)
    redraw(next)
  }

  async function applyAndDone() {
    if (working) return
    setWorking(true)
    try {
      const img = imageRef.current
      if (!img) return
      const blurred = await applyBlurZonesToBlob(img, zones)
      await onDone(blurred, zones)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-cyan-600" />
            <h3 className="font-semibold text-slate-800">Floutage manuel — RGPD</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Décision #4 (06/05) :</strong> floutez manuellement les <strong>plaques d'immatriculation</strong>
            {' '}et les <strong>visages</strong> visibles. Cliquez-glissez sur la photo pour dessiner un rectangle à flouter.
            La version originale reste privée, seule la version floutée est partagée.
          </p>

          <div className="bg-slate-100 rounded-lg flex items-center justify-center p-3 overflow-auto">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="cursor-crosshair touch-none"
              aria-label="Cliquez-glissez pour dessiner une zone à flouter"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className="text-slate-500">
              {zones.length} zone{zones.length > 1 ? 's' : ''} marquée{zones.length > 1 ? 's' : ''} ·
              {' '}échelle affichage : {Math.round(scale * 100)}%
            </p>
            <button
              type="button"
              onClick={undoLast}
              disabled={zones.length === 0}
              className="text-cyan-700 hover:text-cyan-800 disabled:text-slate-300 font-medium"
            >
              Retirer la dernière
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={applyAndDone}
              disabled={working}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {working ? 'Application…' : `Valider${zones.length === 0 ? ' sans flouter' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
