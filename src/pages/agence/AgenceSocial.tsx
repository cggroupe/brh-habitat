/**
 * Phase 16.1 — Page /agence/reseaux-sociaux : partage publications avec
 * récompense en LEADS bonus (au lieu de points/euros pour les Pro).
 *
 * Règle : 2 publications validées par mois max → +5 leads bonus chacune.
 * Le trigger SQL met à jour brh_agence_progression.bonus_leads_unlocked
 * automatiquement à chaque validation par admin BRH.
 */
import { useState } from 'react'
import {
  Share2,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Globe,
  ExternalLink,
  Music,
  Award,
  Hash,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMySocialPosts,
  useMonthlyValidatedCount,
  useCreateSocialPost,
} from '@/hooks/queries/agence-social'
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  REWARD_LEADS_PER_PLATFORM,
  type SocialPlatform,
  type SocialPostType,
} from '@/api/agence-social'

const PLATFORM_ICONS: Record<SocialPlatform, React.ReactNode> = {
  facebook: <Hash size={16} />,
  instagram: <Hash size={16} />,
  linkedin: <Hash size={16} />,
  tiktok: <Music size={16} />,
  google_business: <Globe size={16} />,
}

const POST_TYPE_LABELS: Record<SocialPostType, string> = {
  post: 'Publication classique',
  video: 'Vidéo',
  article: 'Article / blog',
  review: 'Avis Google',
}

const MAX_VALIDATED_PER_MONTH = 2

export default function AgenceSocial() {
  const { data: membership } = useMyAgenceMembership()
  const { data: posts = [], isLoading } = useMySocialPosts(membership?.agenceId)
  const { data: monthlyValidated = 0 } = useMonthlyValidatedCount(membership?.agenceId)
  const createPost = useCreateSocialPost()

  const [platform, setPlatform] = useState<SocialPlatform>('facebook')
  const [postType, setPostType] = useState<SocialPostType>('post')
  const [postUrl, setPostUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const monthCap = monthlyValidated >= MAX_VALIDATED_PER_MONTH
  const expectedReward = REWARD_LEADS_PER_PLATFORM[platform]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membership?.agenceId) return
    setError(null)

    if (!postUrl.startsWith('http')) {
      setError("L'URL de la publication doit commencer par http(s)://")
      return
    }

    try {
      await createPost.mutateAsync({
        agence_id: membership.agenceId,
        platform,
        post_type: postType,
        post_url: postUrl,
        description: description || null,
        reward_leads: expectedReward,
      })
      setSuccess(true)
      setPostUrl('')
      setDescription('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
            <Share2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Réseaux sociaux</h1>
            <p className="text-sm text-slate-500">
              Partagez BRH Habitat sur vos réseaux → débloquez des leads bonus
            </p>
          </div>
        </div>
      </header>

      {/* Récap récompense */}
      <div className="bg-gradient-to-br from-emerald-50 to-pink-50 border-2 border-emerald-200 rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">
              Publications validées ce mois
            </p>
            <p className="text-3xl font-bold tabular-nums text-slate-800 mt-1">
              {monthlyValidated} / {MAX_VALIDATED_PER_MONTH}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Plafond mensuel : {MAX_VALIDATED_PER_MONTH} publications max
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">
              Récompense moyenne
            </p>
            <p className="text-3xl font-bold tabular-nums text-emerald-700 mt-1">
              +5 leads
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              par publication validée (10 max/mois)
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">
              Bonus TikTok / vidéo
            </p>
            <p className="text-3xl font-bold tabular-nums text-pink-600 mt-1">+8 leads</p>
            <p className="text-[11px] text-slate-500 mt-1">
              format vidéo = engagement supérieur
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire de soumission */}
      {monthCap ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-amber-900">Plafond mensuel atteint</p>
            <p className="text-xs text-amber-800">
              Vous avez déjà {MAX_VALIDATED_PER_MONTH} publications validées ce mois — revenez le 1ᵉʳ du mois prochain pour en
              soumettre de nouvelles.
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="font-bold text-slate-800 text-lg">Soumettre une publication</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Plateforme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border-2 transition ${
                    platform === p
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  {PLATFORM_ICONS[p]}
                  <span className="text-[11px] font-semibold">{PLATFORM_LABELS[p]}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    +{REWARD_LEADS_PER_PLATFORM[p]} leads
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type de publication
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as SocialPostType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {Object.entries(POST_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                URL de la publication *
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.facebook.com/..."
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ex : Post sur le DPE F/G, parlant de la rénovation énergétique avec lien BRH..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p className="font-bold mb-1 flex items-center gap-1">
              <Sparkles size={12} />
              Conditions de validation
            </p>
            <ul className="space-y-0.5 leading-snug list-disc list-inside text-blue-800">
              <li>Publication doit mentionner BRH Habitat ou contenir un lien vers le site</li>
              <li>Compte public (visible non-amis)</li>
              <li>Vérification BRH sous 48h ouvrées</li>
              <li>Si validée → +{expectedReward} leads bonus crédités automatiquement</li>
              <li>Plafond {MAX_VALIDATED_PER_MONTH} publications validées par mois</li>
            </ul>
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Publication soumise — un admin BRH vérifie sous 48h.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={createPost.isPending || !postUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold rounded-lg shadow hover:shadow-md disabled:opacity-50 transition"
          >
            <Share2 size={16} />
            {createPost.isPending
              ? 'Envoi…'
              : `Soumettre cette publication (+${expectedReward} leads si validée)`}
          </button>
        </form>
      )}

      {/* Historique */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
          Mes publications ({posts.length})
        </h2>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader className="animate-spin text-pink-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <Share2 size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-700 font-medium">Aucune publication soumise</p>
            <p className="text-xs text-slate-500 mt-1">
              Postez sur vos réseaux + soumettez le lien ici → +5 leads bonus par
              publication validée
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  {PLATFORM_ICONS[p.platform]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <a
                      href={p.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-slate-800 hover:text-pink-600 truncate inline-flex items-center gap-1"
                    >
                      {PLATFORM_LABELS[p.platform]} · {POST_TYPE_LABELS[p.post_type]}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  {p.description ? (
                    <p className="text-[11px] text-slate-500 truncate">{p.description}</p>
                  ) : null}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Soumis le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[11px] ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                  {p.status === 'validee' ? (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1 inline-flex items-center gap-0.5">
                      <Award size={10} />+{p.reward_leads} leads
                    </p>
                  ) : null}
                  {p.rejection_reason ? (
                    <p className="text-[10px] text-red-600 mt-1 max-w-[120px]">
                      {p.rejection_reason}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
