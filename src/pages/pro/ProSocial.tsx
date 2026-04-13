import { isSafeUrl } from '@/lib/utils'
import { useState, useRef } from 'react'
import {
  Share2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Star,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useMySocialPosts, useCreateSocialPost, useMonthlyPostCount } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import type { SocialPlatform, SocialPostType, SocialPostStatus } from '@/types/partner'

// Platform config
const PLATFORMS: { value: SocialPlatform; label: string; icon: React.ReactNode; rewardCents: number }[] = [
  { value: 'facebook', label: 'Facebook', icon: <Facebook size={16} />, rewardCents: 5000 },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={16} />, rewardCents: 5000 },
  { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={16} />, rewardCents: 5000 },
  { value: 'tiktok', label: 'TikTok (video)', icon: <Youtube size={16} />, rewardCents: 10000 },
  { value: 'google_business', label: 'Google Business', icon: <Star size={16} />, rewardCents: 3000 },
]

const POST_TYPES: { value: SocialPostType; label: string }[] = [
  { value: 'post', label: 'Publication' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'review', label: 'Avis client' },
]

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; className: string; icon: React.ReactNode }> = {
  en_attente: { label: 'En attente', className: 'bg-yellow-50 text-yellow-700', icon: <Clock size={12} /> },
  en_cours_verification: { label: 'En verification', className: 'bg-blue-50 text-blue-700', icon: <Clock size={12} /> },
  validee: { label: 'Validee', className: 'bg-green-50 text-green-700', icon: <CheckCircle size={12} /> },
  refusee: { label: 'Refusee', className: 'bg-red-50 text-red-700', icon: <XCircle size={12} /> },
  expiree: { label: 'Expiree', className: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

const MONTHLY_LIMIT = 2

export default function ProSocial() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)
  const { data: posts = [], isLoading: loadingPosts } = useMySocialPosts(user?.id)
  const { data: monthlyCount = 0 } = useMonthlyPostCount(user?.id)
  const createPost = useCreateSocialPost()

  const [platform, setPlatform] = useState<SocialPlatform>('facebook')
  const [postType, setPostType] = useState<SocialPostType>('post')
  const [postUrl, setPostUrl] = useState('')
  const [description, setDescription] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedPlatform = PLATFORMS.find((p) => p.value === platform)
  const rewardCents = selectedPlatform?.rewardCents ?? 0
  const limitReached = monthlyCount >= MONTHLY_LIMIT

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !company) return
    if (limitReached) return
    if (!screenshotFile) {
      setFormError('Veuillez joindre une capture d\'ecran.')
      return
    }

    setFormError(null)
    setUploading(true)

    try {
      // Upload screenshot
      const ext = screenshotFile.name.split('.').pop() ?? 'png'
      const path = `pro/${company.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('social-screenshots')
        .upload(path, screenshotFile, { upsert: false })

      if (uploadError) throw uploadError

      await createPost.mutateAsync({
        submitted_by: user.id,
        submitter_role: 'pro',
        company_id: company.id,
        platform,
        post_type: postType,
        post_url: postUrl.trim(),
        screenshot_path: path,
        description: description.trim() || null,
        reward_type: 'carte_cadeau',
        reward_amount_cents: rewardCents,
      })

      // Reset form
      setPostUrl('')
      setDescription('')
      setScreenshotFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Share2 size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Publications reseaux sociaux
        </h1>
      </div>
      <p className="font-body text-sm text-slate-500 mb-8">
        Partagez vos realisations BRH et obtenez une carte cadeau.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4">
            {/* Monthly counter */}
            <div className="flex items-center justify-between mb-5">
              <span className="font-body text-sm text-slate-600">Publications ce mois</span>
              <span className={`font-display text-sm font-semibold px-3 py-1 rounded-full ${
                limitReached ? 'bg-red-50 text-red-600' : 'bg-green-50 text-primary'
              }`}>
                {monthlyCount}/{MONTHLY_LIMIT}
              </span>
            </div>

            {limitReached && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-5">
                <p className="font-body text-xs text-orange-700">
                  Limite mensuelle atteinte. Vous pourrez soumettre de nouvelles publications le mois prochain.
                </p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600 shrink-0" />
                <p className="font-body text-xs text-green-700">Publication soumise avec succes !</p>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* Platform selector */}
              <div>
                <label className="font-body text-xs text-slate-500 uppercase tracking-wide mb-2 block">
                  Plateforme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlatform(p.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-body transition-colors ${
                        platform === p.value
                          ? 'border-primary bg-primary/5 text-primary font-semibold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {p.icon}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post type */}
              <div>
                <label className="font-body text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Type de publication
                </label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as SocialPostType)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {POST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="font-body text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                  URL de la publication
                </label>
                <input
                  type="url"
                  required
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Screenshot */}
              <div>
                <label className="font-body text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Capture d'ecran
                </label>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {screenshotFile ? (
                    <p className="font-body text-sm text-primary">{screenshotFile.name}</p>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={20} className="text-slate-300" />
                      <p className="font-body text-xs text-slate-400">Cliquer pour ajouter une image</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-body text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Decrivez votre publication..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Reward preview */}
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="font-body text-sm text-slate-600">Carte cadeau estimee</span>
                <span className="font-display text-lg text-primary font-bold">{formatEur(rewardCents)}</span>
              </div>

              {formError && (
                <p className="font-body text-xs text-red-500">{formError}</p>
              )}

              <button
                type="submit"
                disabled={limitReached || uploading || createPost.isPending}
                className="w-full bg-primary text-white font-body text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading || createPost.isPending ? 'Envoi en cours...' : 'Soumettre la publication'}
              </button>
            </form>
          </div>
        </div>

        {/* Past submissions */}
        <div>
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-3">
            Mes soumissions
          </h2>

          {loadingPosts && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
              <p className="font-body text-slate-400 text-sm">Chargement...</p>
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
              <Share2 size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="font-body text-slate-400 text-sm">Aucune publication soumise.</p>
            </div>
          )}

          {!loadingPosts && posts.length > 0 && (
            <div className="space-y-3">
              {posts.map((post) => {
                const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.en_attente
                const platformCfg = PLATFORMS.find((p) => p.value === post.platform)
                return (
                  <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 shrink-0">{platformCfg?.icon}</span>
                        <div className="min-w-0">
                          <p className="font-body text-sm text-slate-800 truncate">{platformCfg?.label}</p>
                          <a
                            href={isSafeUrl(post.post_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs text-primary flex items-center gap-1 hover:underline truncate"
                          >
                            Voir la publication <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                      <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body ${cfg.className}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-body text-xs text-slate-400">
                        {new Date(post.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {post.reward_amount_cents != null && (
                        <span className="font-body text-xs text-primary font-semibold">
                          {formatEur(post.reward_amount_cents)}
                        </span>
                      )}
                    </div>
                    {post.rejection_reason && (
                      <p className="mt-2 font-body text-xs text-red-500 bg-red-50 rounded px-2 py-1">
                        Motif : {post.rejection_reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
