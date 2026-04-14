import { useRef } from 'react'
import { Upload, CheckCircle, Star } from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from '@/components/ui/SocialIcons'
import type { SocialPlatform, SocialPostType } from '@/types/partner'

const PLATFORMS: { value: SocialPlatform; label: string; icon: React.ReactNode; rewardCents: number }[] = [
  { value: 'facebook', label: 'Facebook', icon: <FacebookIcon size={15} />, rewardCents: 5000 },
  { value: 'instagram', label: 'Instagram', icon: <InstagramIcon size={15} />, rewardCents: 5000 },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedinIcon size={15} />, rewardCents: 5000 },
  { value: 'tiktok', label: 'TikTok (video)', icon: <TiktokIcon size={15} />, rewardCents: 10000 },
  { value: 'google_business', label: 'Google Business', icon: <Star size={15} />, rewardCents: 3000 },
]

const POST_TYPES: { value: SocialPostType; label: string }[] = [
  { value: 'post', label: 'Publication' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'review', label: 'Avis client' },
]

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

const MONTHLY_LIMIT = 2

interface ProSocialFormProps {
  monthlyCount: number
  platform: SocialPlatform
  postType: SocialPostType
  postUrl: string
  description: string
  screenshotFile: File | null
  uploading: boolean
  formError: string | null
  success: boolean
  isPending: boolean
  onPlatformChange: (v: SocialPlatform) => void
  onPostTypeChange: (v: SocialPostType) => void
  onPostUrlChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onScreenshotChange: (file: File | null) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ProSocialForm({
  monthlyCount,
  platform,
  postType,
  postUrl,
  description,
  screenshotFile,
  uploading,
  formError,
  success,
  isPending,
  onPlatformChange,
  onPostTypeChange,
  onPostUrlChange,
  onDescriptionChange,
  onScreenshotChange,
  onSubmit,
}: ProSocialFormProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedPlatform = PLATFORMS.find((p) => p.value === platform)
  const rewardCents = selectedPlatform?.rewardCents ?? 0
  const limitReached = monthlyCount >= MONTHLY_LIMIT

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-background hover:border-text-light/30 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors'

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
      {/* Monthly counter */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Publications ce mois</span>
        <span className={`font-display text-sm font-bold px-3 py-1.5 rounded-full ${
          limitReached ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
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
        <div className="bg-primary/10 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle size={15} className="text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">Publication soumise avec succes !</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Platform selector */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">Plateforme</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onPlatformChange(p.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  platform === p.value
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'bg-background text-text-light hover:text-text-primary'
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
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">
            Type de publication
          </label>
          <select
            value={postType}
            onChange={(e) => onPostTypeChange(e.target.value as SocialPostType)}
            className={inputClass}
          >
            {POST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* URL */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">
            URL de la publication
          </label>
          <input
            type="url"
            required
            value={postUrl}
            onChange={(e) => onPostUrlChange(e.target.value)}
            placeholder="https://www.facebook.com/..."
            className={inputClass}
          />
        </div>

        {/* Screenshot */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">
            Capture d'ecran
          </label>
          <div
            className="border-2 border-dashed border-background hover:border-primary/30 rounded-2xl p-5 text-center cursor-pointer transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {screenshotFile ? (
              <p className="text-sm font-medium text-primary">{screenshotFile.name}</p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                  <Upload size={18} className="text-text-light/50" />
                </div>
                <p className="text-xs text-text-light">Cliquer pour ajouter une image</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onScreenshotChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">
            Description (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Decrivez votre publication..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Reward preview */}
        <div className="bg-primary/10 rounded-xl px-5 py-4 flex items-center justify-between">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Carte cadeau estimee</span>
          <span className="font-display text-lg font-bold text-primary">{formatEur(rewardCents)}</span>
        </div>

        {formError && (
          <p className="text-xs text-red-500 font-medium">{formError}</p>
        )}

        <button
          type="submit"
          disabled={limitReached || uploading || isPending}
          className="w-full bg-gradient-to-br from-primary to-primary-dark text-white py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {uploading || isPending ? 'Envoi en cours...' : 'Soumettre la publication'}
        </button>
      </form>
    </div>
  )
}
