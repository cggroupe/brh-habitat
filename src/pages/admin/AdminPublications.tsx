import { isSafeUrl } from '@/lib/utils'
import { useState } from 'react'
import {
  Share2,
  Star,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from '@/components/ui/SocialIcons'
import { useAdminSocialPosts, useUpdateSocialPostStatus } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import type { SocialPlatform, SocialPostStatus } from '@/types/partner'

const PAGE_SIZE = 10

const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; icon: React.ReactNode }> = {
  facebook: { label: 'Facebook', icon: <FacebookIcon size={14} /> },
  instagram: { label: 'Instagram', icon: <InstagramIcon size={14} /> },
  linkedin: { label: 'LinkedIn', icon: <LinkedinIcon size={14} /> },
  tiktok: { label: 'TikTok', icon: <TiktokIcon size={14} /> },
  google_business: { label: 'Google', icon: <Star size={14} /> },
}

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; className: string; icon: React.ReactNode }> = {
  en_attente: { label: 'En attente', className: 'bg-yellow-50 text-yellow-700', icon: <Clock size={12} /> },
  en_cours_verification: { label: 'En verification', className: 'bg-blue-50 text-blue-700', icon: <Clock size={12} /> },
  validee: { label: 'Validee', className: 'bg-green-50 text-green-700', icon: <CheckCircle size={12} /> },
  refusee: { label: 'Refusee', className: 'bg-red-50 text-red-700', icon: <XCircle size={12} /> },
  expiree: { label: 'Expiree', className: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
}

type FilterTab = 'all' | SocialPostStatus

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'validee', label: 'Validees' },
  { value: 'refusee', label: 'Refusees' },
]

function getPublicScreenshotUrl(path: string): string {
  const { data } = supabase.storage.from('social-screenshots').getPublicUrl(path)
  return data.publicUrl
}

function formatEur(cents: number | null): string {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

export default function AdminPublications() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(0)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionText, setRejectionText] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const statusFilter = activeTab === 'all' ? undefined : activeTab
  const { data, isLoading } = useAdminSocialPosts(page, statusFilter)
  const updateStatus = useUpdateSocialPostStatus()

  const posts = data?.data ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab)
    setPage(0)
  }

  async function handleValidate(id: string) {
    await updateStatus.mutateAsync({ id, status: 'validee' })
  }

  async function handleReject(id: string) {
    if (!rejectionText.trim()) return
    await updateStatus.mutateAsync({ id, status: 'refusee', rejectionReason: rejectionText.trim() })
    setRejectingId(null)
    setRejectionText('')
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
      <p className="font-body text-sm text-slate-500 mb-6">
        Validez ou refusez les publications soumises par les partenaires et particuliers.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`font-body text-sm px-4 py-1.5 rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-slate-800 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center">
            <p className="font-body text-slate-400 text-sm">Chargement...</p>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="p-12 text-center">
            <Share2 size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-body text-slate-400 text-sm">Aucune publication trouvee.</p>
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Soumetteur</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Plateforme</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">URL / Capture</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Recompense</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Statut</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map((post) => {
                  const platformCfg = PLATFORM_CONFIG[post.platform] ?? { label: post.platform, icon: null }
                  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.en_attente
                  const isRejecting = rejectingId === post.id
                  const screenshotUrl = post.screenshot_path ? getPublicScreenshotUrl(post.screenshot_path) : null

                  return (
                    <>
                      <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                        {/* Soumetteur */}
                        <td className="px-4 py-3">
                          <p className="font-body text-xs text-slate-500 font-mono">{post.submitted_by.slice(0, 8)}...</p>
                          <p className="font-body text-xs text-slate-400">{post.submitter_role === 'pro' ? 'Partenaire' : 'Particulier'}</p>
                        </td>

                        {/* Plateforme */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-body text-sm text-slate-700">
                            <span className="text-slate-400">{platformCfg.icon}</span>
                            {platformCfg.label}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3 font-body text-sm text-slate-600 hidden md:table-cell capitalize">
                          {post.post_type}
                        </td>

                        {/* URL & screenshot */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={isSafeUrl(post.post_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink size={14} />
                            </a>
                            {screenshotUrl && (
                              <button
                                onClick={() => setPreviewUrl(previewUrl === screenshotUrl ? null : screenshotUrl)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title="Voir la capture"
                              >
                                <ImageIcon size={14} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Recompense */}
                        <td className="px-4 py-3 font-body text-sm text-slate-700">
                          {post.reward_type === 'carte_cadeau'
                            ? formatEur(post.reward_amount_cents)
                            : `${post.reward_points ?? 0} pts`}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body w-fit ${statusCfg.className}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 font-body text-xs text-slate-400 hidden lg:table-cell">
                          {new Date(post.created_at).toLocaleDateString('fr-FR')}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          {post.status === 'en_attente' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => void handleValidate(post.id)}
                                disabled={updateStatus.isPending}
                                className="flex items-center gap-1 bg-green-500 text-white text-xs font-body font-semibold px-2.5 py-1 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle size={12} /> Valider
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(isRejecting ? null : post.id)
                                  setRejectionText('')
                                }}
                                className="flex items-center gap-1 bg-red-500 text-white text-xs font-body font-semibold px-2.5 py-1 rounded-lg hover:bg-red-600 transition-colors"
                              >
                                <XCircle size={12} /> Refuser
                              </button>
                            </div>
                          )}
                          {post.rejection_reason && (
                            <p className="font-body text-xs text-red-400 max-w-[160px] truncate" title={post.rejection_reason}>
                              {post.rejection_reason}
                            </p>
                          )}
                        </td>
                      </tr>

                      {/* Screenshot preview row */}
                      {screenshotUrl && previewUrl === screenshotUrl && (
                        <tr key={`${post.id}-preview`}>
                          <td colSpan={8} className="px-4 pb-4 bg-slate-50">
                            <img
                              src={screenshotUrl}
                              alt="Capture d'ecran de la publication"
                              className="max-h-64 rounded-lg border border-slate-200 object-contain"
                            />
                          </td>
                        </tr>
                      )}

                      {/* Rejection form row */}
                      {isRejecting && (
                        <tr key={`${post.id}-reject`}>
                          <td colSpan={8} className="px-4 pb-4 bg-red-50">
                            <div className="flex items-start gap-2 pt-2">
                              <textarea
                                value={rejectionText}
                                onChange={(e) => setRejectionText(e.target.value)}
                                placeholder="Motif du refus..."
                                rows={2}
                                className="flex-1 border border-red-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                              />
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button
                                  onClick={() => void handleReject(post.id)}
                                  disabled={!rejectionText.trim() || updateStatus.isPending}
                                  className="bg-red-500 text-white text-xs font-body font-semibold px-3 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                  Confirmer le refus
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectionText('') }}
                                  className="bg-white border border-slate-200 text-slate-600 text-xs font-body px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="font-body text-xs text-slate-400">
              {totalCount} publication{totalCount > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-body text-xs text-slate-600">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
