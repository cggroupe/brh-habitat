import { isSafeUrl } from '@/lib/utils'
import { useState, useRef } from 'react'
import {
  Share2, Facebook, Instagram, Linkedin, Video, Star, Clock,
  XCircle, CheckCircle, AlertCircle, Upload, ExternalLink, Plus, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMySocialPosts, useCreateSocialPost, useMonthlyPostCount } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import type { SocialPlatform, SocialPostType, BrhSocialPostRow } from '@/types/partner'

// ─── Reward estimates ────────────────────────────────────────────────────────

const REWARD_MAP: Record<string, number> = {
  facebook_post: 50,
  facebook_video: 100,
  facebook_article: 50,
  facebook_review: 30,
  instagram_post: 50,
  instagram_video: 100,
  instagram_article: 50,
  instagram_review: 30,
  linkedin_post: 50,
  linkedin_video: 100,
  linkedin_article: 50,
  linkedin_review: 30,
  tiktok_post: 50,
  tiktok_video: 100,
  tiktok_article: 50,
  tiktok_review: 30,
  google_business_post: 30,
  google_business_video: 50,
  google_business_article: 30,
  google_business_review: 30,
}

function getRewardEstimate(platform: SocialPlatform | '', postType: SocialPostType | ''): number {
  if (!platform || !postType) return 0
  return REWARD_MAP[`${platform}_${postType}`] ?? 30
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS: { value: SocialPlatform; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'facebook',        label: 'Facebook',        Icon: Facebook },
  { value: 'instagram',       label: 'Instagram',       Icon: Instagram },
  { value: 'linkedin',        label: 'LinkedIn',        Icon: Linkedin },
  { value: 'tiktok',          label: 'TikTok',          Icon: Video },
  { value: 'google_business', label: 'Google Business', Icon: Star },
]

const POST_TYPES: { value: SocialPostType; label: string }[] = [
  { value: 'post',    label: 'Post / Publication' },
  { value: 'video',   label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'review',  label: 'Avis / Evaluation' },
]

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BrhSocialPostRow['status'] }) {
  const cfg = {
    validee:              { label: 'Validee',          cls: 'bg-green-100 text-green-700',  Icon: CheckCircle },
    en_attente:           { label: 'En attente',       cls: 'bg-yellow-100 text-yellow-700',Icon: Clock },
    en_cours_verification:{ label: 'En verification',  cls: 'bg-blue-100 text-blue-700',    Icon: Clock },
    refusee:              { label: 'Refusee',          cls: 'bg-red-100 text-red-700',      Icon: XCircle },
    expiree:              { label: 'Expiree',          cls: 'bg-[#f5f3f2] text-[#707a6a]', Icon: AlertCircle },
  }[status]

  if (!cfg) return null
  const { label, cls, Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', google_business: 'Google Business',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PartSocial() {
  const { user } = useAuth()
  const { data: posts = [], isLoading } = useMySocialPosts(user?.id)
  const { data: monthlyCount = 0 } = useMonthlyPostCount(user?.id)
  const createPost = useCreateSocialPost()

  const [showForm, setShowForm] = useState(false)
  const [platform, setPlatform] = useState<SocialPlatform | ''>('')
  const [postType, setPostType] = useState<SocialPostType | ''>('')
  const [postUrl, setPostUrl] = useState('')
  const [description, setDescription] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [screenshotPath, setScreenshotPath] = useState('')
  const [screenshotName, setScreenshotName] = useState('')
  const [submitError, setSubmitError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const MONTHLY_LIMIT = 2
  const limitReached = monthlyCount >= MONTHLY_LIMIT
  const reward = getRewardEstimate(platform, postType)

  const urlValid = postUrl.startsWith('http://') || postUrl.startsWith('https://')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError('')
    setUploading(true)
    try {
      const path = `${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('social-screenshots')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw error
      setScreenshotPath(path)
      setScreenshotName(file.name)
    } catch {
      setUploadError('Echec du telechargement. Reessayez.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !platform || !postType || !screenshotPath) return
    setSubmitError('')
    try {
      await createPost.mutateAsync({
        submitted_by: user.id,
        submitter_role: 'particulier',
        platform,
        post_type: postType,
        post_url: postUrl,
        screenshot_path: screenshotPath,
        description: description || null,
        reward_type: 'points',
        reward_points: reward * 10,
      })
      setShowForm(false)
      setPlatform('')
      setPostType('')
      setPostUrl('')
      setDescription('')
      setScreenshotPath('')
      setScreenshotName('')
    } catch {
      setSubmitError('Une erreur est survenue. Veuillez reessayer.')
    }
  }

  function resetForm() {
    setShowForm(false)
    setPlatform('')
    setPostType('')
    setPostUrl('')
    setDescription('')
    setScreenshotPath('')
    setScreenshotName('')
    setSubmitError('')
    setUploadError('')
  }

  const canSubmit =
    !!platform && !!postType && urlValid && !!screenshotPath && !uploading && !limitReached

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Réseaux sociaux</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-[#1b1c1c]">
            Publications
          </h1>
          <p className="text-sm text-[#707a6a] mt-1">Soumettez vos publications BRH et gagnez des points</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-xs px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest ${
            limitReached
              ? 'bg-red-100 text-red-700'
              : 'bg-[#f5f3f2] text-[#707a6a]'
          }`}>
            {monthlyCount}/{MONTHLY_LIMIT} ce mois
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              disabled={limitReached}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              Soumettre
            </button>
          )}
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Formulaire</p>
              <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em] text-[#1b1c1c]">
                Nouvelle publication
              </h2>
            </div>
            <button onClick={resetForm} className="p-2 text-[#707a6a] hover:text-[#1b1c1c] rounded-xl hover:bg-[#f5f3f2] transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {/* Platform */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">Plateforme</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      platform === value
                        ? 'bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white'
                        : 'bg-[#f5f3f2] text-[#404a3c] hover:bg-[#e8e5e2]'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post type */}
            <div>
              <label htmlFor="post-type" className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Type de publication
              </label>
              <select
                id="post-type"
                value={postType}
                onChange={e => setPostType(e.target.value as SocialPostType)}
                className="w-full bg-[#f5f3f2] rounded-xl px-4 py-3 text-sm text-[#1b1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white transition-all"
              >
                <option value="">Choisir un type...</option>
                {POST_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* URL */}
            <div>
              <label htmlFor="post-url" className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                URL de la publication
              </label>
              <div className="relative">
                <input
                  id="post-url"
                  type="url"
                  value={postUrl}
                  onChange={e => setPostUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full rounded-xl px-4 py-3 pr-10 text-sm text-[#1b1c1c] placeholder:text-[#707a6a]/50 focus:outline-none focus:ring-2 focus:ring-[#1c7b1d]/30 transition-all ${
                    postUrl && !urlValid
                      ? 'bg-red-50 ring-2 ring-red-300'
                      : 'bg-[#f5f3f2] focus:bg-white'
                  }`}
                />
                {postUrl && urlValid && (
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707a6a] hover:text-[#1c7b1d]"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
              {postUrl && !urlValid && (
                <p className="text-xs text-red-600 mt-1.5">L'URL doit commencer par http:// ou https://</p>
              )}
            </div>

            {/* Screenshot */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">Capture d'ecran</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              {screenshotPath ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <CheckCircle size={16} className="text-green-600 shrink-0" />
                  <span className="text-sm text-green-700 truncate flex-1 font-medium">{screenshotName}</span>
                  <button
                    type="button"
                    onClick={() => { setScreenshotPath(''); setScreenshotName('') }}
                    className="text-green-400 hover:text-red-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed border-[#e8e5e2] rounded-2xl text-[#707a6a] hover:border-[#1c7b1d] hover:text-[#1c7b1d] transition-all disabled:opacity-50 text-sm font-medium"
                >
                  <Upload size={16} />
                  {uploading ? 'Telechargement...' : "Choisir une capture d'ecran"}
                </button>
              )}
              {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Description <span className="normal-case font-normal text-[#707a6a]/70">(optionnel)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Decrivez brievement votre publication..."
                className="w-full bg-[#f5f3f2] rounded-xl px-4 py-3 text-sm text-[#1b1c1c] placeholder:text-[#707a6a]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white transition-all"
              />
            </div>

            {/* Reward preview */}
            {reward > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <Star size={16} className="text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800">
                  Recompense estimee : <span className="font-bold">{reward} EUR</span>
                  {' '}({reward * 10} points)
                </p>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            {limitReached && (
              <p className="text-sm text-red-600 font-medium">
                Limite mensuelle atteinte ({MONTHLY_LIMIT} publications). Revenez le mois prochain.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-3 bg-[#f5f3f2] rounded-xl text-sm font-medium text-[#404a3c] hover:bg-[#e8e5e2] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!canSubmit || createPost.isPending}
                className="flex-1 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPost.isPending ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1c7b1d] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-[#f5f3f2] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Share2 size={28} className="text-[#707a6a]" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-[#404a3c] mb-2">
            Aucune publication soumise
          </p>
          <p className="text-sm text-[#707a6a]">
            Partagez vos publications BRH Habitat pour gagner des points.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div
              key={post.id}
              className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-bold text-sm text-[#1b1c1c] uppercase tracking-wide">
                      {PLATFORM_LABELS[post.platform]}
                    </span>
                    <span className="text-[#707a6a]/40">·</span>
                    <span className="text-xs text-[#707a6a] capitalize">{post.post_type}</span>
                    <StatusBadge status={post.status} />
                  </div>
                  <a
                    href={isSafeUrl(post.post_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1c7b1d] hover:underline truncate block max-w-xs"
                  >
                    {post.post_url}
                  </a>
                  {post.description && (
                    <p className="text-xs text-[#707a6a] mt-1 line-clamp-2">{post.description}</p>
                  )}
                  {post.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1 font-medium">Motif : {post.rejection_reason}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {post.reward_points && (
                    <p className="font-display font-bold text-sm text-amber-600">+{post.reward_points} pts</p>
                  )}
                  <p className="text-xs text-[#707a6a] mt-0.5">{formatDate(post.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
