import { useState, useRef } from 'react'
import {
  Video, Star, CheckCircle, Upload, ExternalLink, X,
} from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { useCreateSocialPost, useMonthlyPostCount } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import type { SocialPlatform, SocialPostType } from '@/types/partner'

// ─── Reward estimates ─────────────────────────────────────────────────────────

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

const PLATFORMS: { value: SocialPlatform; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { value: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { value: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { value: 'tiktok', label: 'TikTok', Icon: Video },
  { value: 'google_business', label: 'Google Business', Icon: Star },
]

const POST_TYPES: { value: SocialPostType; label: string }[] = [
  { value: 'post', label: 'Post / Publication' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'review', label: 'Avis / Evaluation' },
]

const MONTHLY_LIMIT = 2

interface SocialPostFormProps {
  userId: string
  onClose: () => void
}

export function SocialPostForm({ userId, onClose }: SocialPostFormProps) {
  const { data: monthlyCount = 0 } = useMonthlyPostCount(userId)
  const createPost = useCreateSocialPost()

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

  const limitReached = monthlyCount >= MONTHLY_LIMIT
  const reward = getRewardEstimate(platform, postType)
  const urlValid = postUrl.startsWith('http://') || postUrl.startsWith('https://')

  function resetForm() {
    setPlatform('')
    setPostType('')
    setPostUrl('')
    setDescription('')
    setScreenshotPath('')
    setScreenshotName('')
    setSubmitError('')
    setUploadError('')
    onClose()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const path = `${userId}/${Date.now()}.jpg`
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
    if (!platform || !postType || !screenshotPath) return
    setSubmitError('')
    try {
      await createPost.mutateAsync({
        submitted_by: userId,
        submitter_role: 'particulier',
        platform,
        post_type: postType,
        post_url: postUrl,
        screenshot_path: screenshotPath,
        description: description || null,
        reward_type: 'points',
        reward_points: reward * 10,
      })
      resetForm()
    } catch {
      setSubmitError('Une erreur est survenue. Veuillez reessayer.')
    }
  }

  const canSubmit = !!platform && !!postType && urlValid && !!screenshotPath && !uploading && !limitReached

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Formulaire</p>
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em] text-text-primary">
            Nouvelle publication
          </h2>
        </div>
        <button onClick={resetForm} className="p-2 text-text-light hover:text-text-primary rounded-xl hover:bg-background transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Platform */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">Plateforme</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlatform(value)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  platform === value
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
                    : 'bg-background text-text-secondary hover:bg-neutral-light'
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
          <label htmlFor="post-type" className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
            Type de publication
          </label>
          <select
            id="post-type"
            value={postType}
            onChange={e => setPostType(e.target.value as SocialPostType)}
            className="w-full bg-background rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
          >
            <option value="">Choisir un type...</option>
            {POST_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* URL */}
        <div>
          <label htmlFor="post-url" className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
            URL de la publication
          </label>
          <div className="relative">
            <input
              id="post-url"
              type="url"
              value={postUrl}
              onChange={e => setPostUrl(e.target.value)}
              placeholder="https://..."
              className={`w-full rounded-xl px-4 py-3 pr-10 text-sm text-text-primary placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                postUrl && !urlValid
                  ? 'bg-red-50 ring-2 ring-red-300'
                  : 'bg-background focus:bg-white'
              }`}
            />
            {postUrl && urlValid && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary"
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
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">Capture d'ecran</p>
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
              className="w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed border-neutral-light rounded-2xl text-text-light hover:border-primary hover:text-primary transition-all disabled:opacity-50 text-sm font-medium"
            >
              <Upload size={16} />
              {uploading ? 'Telechargement...' : "Choisir une capture d'ecran"}
            </button>
          )}
          {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">
            Description <span className="normal-case font-normal text-text-light/70">(optionnel)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Decrivez brievement votre publication..."
            className="w-full bg-background rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-light/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
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

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        {limitReached && (
          <p className="text-sm text-red-600 font-medium">
            Limite mensuelle atteinte ({MONTHLY_LIMIT} publications). Revenez le mois prochain.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 px-4 py-3 bg-background rounded-xl text-sm font-medium text-text-secondary hover:bg-neutral-light transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!canSubmit || createPost.isPending}
            className="flex-1 bg-gradient-to-br from-primary to-primary-dark text-white px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPost.isPending ? 'Envoi...' : 'Soumettre'}
          </button>
        </div>
      </form>
    </div>
  )
}
