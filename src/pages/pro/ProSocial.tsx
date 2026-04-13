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
  { value: 'facebook', label: 'Facebook', icon: <Facebook size={15} />, rewardCents: 5000 },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={15} />, rewardCents: 5000 },
  { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={15} />, rewardCents: 5000 },
  { value: 'tiktok', label: 'TikTok (video)', icon: <Youtube size={15} />, rewardCents: 10000 },
  { value: 'google_business', label: 'Google Business', icon: <Star size={15} />, rewardCents: 3000 },
]

const POST_TYPES: { value: SocialPostType; label: string }[] = [
  { value: 'post', label: 'Publication' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'review', label: 'Avis client' },
]

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; className: string; icon: React.ReactNode }> = {
  en_attente: { label: 'En attente', className: 'bg-amber-50 text-amber-700', icon: <Clock size={11} /> },
  en_cours_verification: { label: 'En verification', className: 'bg-blue-50 text-blue-700', icon: <Clock size={11} /> },
  validee: { label: 'Validee', className: 'bg-[#1c7b1d]/10 text-[#1c7b1d]', icon: <CheckCircle size={11} /> },
  refusee: { label: 'Refusee', className: 'bg-red-50 text-red-600', icon: <XCircle size={11} /> },
  expiree: { label: 'Expiree', className: 'bg-[#f5f3f2] text-[#707a6a]', icon: <XCircle size={11} /> },
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

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-[#f5f3f2] hover:border-[#707a6a]/30 text-sm text-[#1b1c1c] bg-white focus:outline-none focus:ring-2 focus:ring-[#1c7b1d]/20 focus:border-[#1c7b1d]/40 transition-colors'

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Marketing</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">
          Publications sociales
        </h1>
        <p className="text-sm text-[#707a6a] mt-1">
          Partagez vos realisations BRH et obtenez une carte cadeau.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            {/* Monthly counter */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-bold text-[#404a3c] uppercase tracking-wider">Publications ce mois</span>
              <span className={`font-display text-sm font-bold px-3 py-1.5 rounded-full ${
                limitReached
                  ? 'bg-red-50 text-red-600'
                  : 'bg-[#1c7b1d]/10 text-[#1c7b1d]'
              }`}>
                {monthlyCount}/{MONTHLY_LIMIT}
              </span>
            </div>

            {limitReached && (
              <div className="bg-amber-50 rounded-xl p-4 mb-5">
                <p className="text-xs text-amber-700 font-medium">
                  Limite mensuelle atteinte. Vous pourrez soumettre de nouvelles publications le mois prochain.
                </p>
              </div>
            )}

            {success && (
              <div className="bg-[#1c7b1d]/10 rounded-xl p-4 mb-5 flex items-center gap-3">
                <CheckCircle size={15} className="text-[#1c7b1d] shrink-0" />
                <p className="text-xs text-[#1c7b1d] font-medium">Publication soumise avec succes !</p>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* Platform selector */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">
                  Plateforme
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlatform(p.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                        platform === p.value
                          ? 'bg-[#1c7b1d]/10 text-[#1c7b1d] ring-1 ring-[#1c7b1d]/30'
                          : 'bg-[#f5f3f2] text-[#707a6a] hover:text-[#1b1c1c]'
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
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">
                  Type de publication
                </label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as SocialPostType)}
                  className={inputClass}
                >
                  {POST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">
                  URL de la publication
                </label>
                <input
                  type="url"
                  required
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className={inputClass}
                />
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">
                  Capture d'ecran
                </label>
                <div
                  className="border-2 border-dashed border-[#f5f3f2] hover:border-[#1c7b1d]/30 rounded-2xl p-5 text-center cursor-pointer transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {screenshotFile ? (
                    <p className="text-sm font-medium text-[#1c7b1d]">{screenshotFile.name}</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[#f5f3f2] flex items-center justify-center">
                        <Upload size={18} className="text-[#707a6a]/50" />
                      </div>
                      <p className="text-xs text-[#707a6a]">Cliquer pour ajouter une image</p>
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
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Decrivez votre publication..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Reward preview */}
              <div className="bg-[#1c7b1d]/10 rounded-xl px-5 py-4 flex items-center justify-between">
                <span className="text-xs font-bold text-[#404a3c] uppercase tracking-wider">Carte cadeau estimee</span>
                <span className="font-display text-lg font-bold text-[#1c7b1d]">{formatEur(rewardCents)}</span>
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-medium">{formError}</p>
              )}

              <button
                type="submit"
                disabled={limitReached || uploading || createPost.isPending}
                className="w-full bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {uploading || createPost.isPending ? 'Envoi en cours...' : 'Soumettre la publication'}
              </button>
            </form>
          </div>
        </div>

        {/* Past submissions */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-4">
            Mes soumissions
          </p>

          {loadingPosts && (
            <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <div className="w-7 h-7 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-3">
                <Share2 size={22} className="text-[#707a6a]/30" />
              </div>
              <p className="text-sm font-medium text-[#707a6a]">Aucune publication soumise.</p>
            </div>
          )}

          {!loadingPosts && posts.length > 0 && (
            <div className="space-y-3">
              {posts.map((post) => {
                const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.en_attente
                const platformCfg = PLATFORMS.find((p) => p.value === post.platform)
                return (
                  <div key={post.id} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#f5f3f2] flex items-center justify-center text-[#707a6a] shrink-0">
                          {platformCfg?.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1b1c1c] truncate">{platformCfg?.label}</p>
                          <a
                            href={isSafeUrl(post.post_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#1c7b1d] flex items-center gap-1 hover:underline truncate font-medium"
                          >
                            Voir la publication <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      <span className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[#707a6a]">
                        {new Date(post.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {post.reward_amount_cents != null && (
                        <span className="text-xs font-bold text-[#1c7b1d]">
                          {formatEur(post.reward_amount_cents)}
                        </span>
                      )}
                    </div>
                    {post.rejection_reason && (
                      <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 rounded-xl px-3 py-2">
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
