import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMySocialPosts, useMonthlyPostCount } from '@/hooks/queries'
import { SocialPostForm } from './part-social/SocialPostForm'
import { SocialPostList } from './part-social/SocialPostList'

const MONTHLY_LIMIT = 2

export default function PartSocial() {
  const { user } = useAuth()
  const { data: posts = [], isLoading } = useMySocialPosts(user?.id)
  const { data: monthlyCount = 0 } = useMonthlyPostCount(user?.id)

  const [showForm, setShowForm] = useState(false)

  const limitReached = monthlyCount >= MONTHLY_LIMIT

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Réseaux sociaux</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
            Publications
          </h1>
          <p className="text-sm text-text-light mt-1">Soumettez vos publications BRH et gagnez des points</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-xs px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest ${
            limitReached
              ? 'bg-red-100 text-red-700'
              : 'bg-background text-text-light'
          }`}>
            {monthlyCount}/{MONTHLY_LIMIT} ce mois
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              disabled={limitReached}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              Soumettre
            </button>
          )}
        </div>
      </div>

      {/* Inline form */}
      {showForm && user && (
        <SocialPostForm
          userId={user.id}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Posts list */}
      <SocialPostList posts={posts} isLoading={isLoading} />
    </div>
  )
}
