import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useMySocialPosts, useCreateSocialPost, useMonthlyPostCount } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import { ProSocialForm } from './pro-social/ProSocialForm'
import { ProSocialPostList } from './pro-social/ProSocialPostList'
import type { SocialPlatform, SocialPostType } from '@/types/partner'

const PLATFORMS_REWARDS: Record<SocialPlatform, number> = {
  facebook: 5000,
  instagram: 5000,
  linkedin: 5000,
  tiktok: 10000,
  google_business: 3000,
}

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !company) return
    if (monthlyCount >= 2) return
    if (!screenshotFile) {
      setFormError("Veuillez joindre une capture d'ecran.")
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
        reward_amount_cents: PLATFORMS_REWARDS[platform] ?? 0,
      })

      setPostUrl('')
      setDescription('')
      setScreenshotFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Marketing</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
          Publications sociales
        </h1>
        <p className="text-sm text-text-light mt-1">
          Partagez vos realisations BRH et obtenez une carte cadeau.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <ProSocialForm
          monthlyCount={monthlyCount}
          platform={platform}
          postType={postType}
          postUrl={postUrl}
          description={description}
          screenshotFile={screenshotFile}
          uploading={uploading}
          formError={formError}
          success={success}
          isPending={createPost.isPending}
          onPlatformChange={setPlatform}
          onPostTypeChange={setPostType}
          onPostUrlChange={setPostUrl}
          onDescriptionChange={setDescription}
          onScreenshotChange={setScreenshotFile}
          onSubmit={(e) => void handleSubmit(e)}
        />

        {/* Past submissions */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
            Mes soumissions
          </p>
          <ProSocialPostList posts={posts} isLoading={loadingPosts} />
        </div>
      </div>
    </div>
  )
}
