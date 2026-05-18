/**
 * EmployeSocial — Déclarer une publication sociale (Phase V2.4).
 *
 * L'employé publie sur LinkedIn/TikTok/Instagram, puis vient ici déclarer la
 * publication. +10 pts auto via trigger DB. 6 templates BRH disponibles pour
 * inspiration (loi Climat, recrutement artisans, conseil DPE, aides 2026, etc.).
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Send, ExternalLink, Award, Copy, CheckCircle2, Loader2 } from 'lucide-react'
import { socialPublicationsApi, type SocialPlatform, type SocialPostTemplate } from '@/api/social-publications'
import { useMyEmployee } from '@/hooks/queries/brh-employees'
import { EMPLOYEES_KEY } from '@/hooks/queries/brh-employees'

const PLATFORMS: { key: SocialPlatform; label: string; initials: string; color: string }[] = [
  { key: 'linkedin', label: 'LinkedIn', initials: 'IN', color: '#0A66C2' },
  { key: 'tiktok', label: 'TikTok', initials: 'TT', color: '#000000' },
  { key: 'instagram', label: 'Instagram', initials: 'IG', color: '#E1306C' },
  { key: 'facebook', label: 'Facebook', initials: 'FB', color: '#1877F2' },
  { key: 'twitter', label: 'X', initials: 'X', color: '#000000' },
]

export default function EmployeSocial() {
  const qc = useQueryClient()
  const { data: employee } = useMyEmployee()
  const { data: templates = [] } = useQuery({
    queryKey: ['social-templates'],
    queryFn: () => socialPublicationsApi.listTemplates(),
    staleTime: 5 * 60_000,
  })
  const { data: recent = [] } = useQuery({
    queryKey: [...EMPLOYEES_KEY, 'social-recent', employee?.id],
    queryFn: () => (employee ? socialPublicationsApi.myRecent(employee.id) : Promise.resolve([])),
    enabled: !!employee,
    staleTime: 30_000,
  })

  const [platform, setPlatform] = useState<SocialPlatform>('linkedin')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<SocialPostTemplate | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  const filteredTemplates = templates.filter((t) => t.platform === platform || t.platform === 'all')

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!employee) throw new Error('Employé non chargé')
      if (!url.trim()) throw new Error('URL requise')
      if (!/^https?:\/\//i.test(url.trim())) throw new Error('URL invalide (commencer par http(s)://)')
      return socialPublicationsApi.create({
        employee_id: employee.id,
        platform,
        content_text: content.trim(),
        publication_url: url.trim() || undefined,
        template_id: selectedTemplate?.id,
      })
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', msg: '✅ Publication enregistrée ! +10 pts' })
      setContent('')
      setUrl('')
      setSelectedTemplate(null)
      qc.invalidateQueries({ queryKey: EMPLOYEES_KEY })
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', msg: `❌ ${err.message}` })
    },
  })

  const totalPosts = recent.length
  const monthPosts = recent.filter(
    (r) => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length

  function copyTemplate(content: string, hashtags: string[] | null) {
    const full = hashtags ? `${content}\n\n${hashtags.join(' ')}` : content
    navigator.clipboard.writeText(full).then(() => {
      setCopied(content.slice(0, 20))
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function useTemplate(t: SocialPostTemplate) {
    setSelectedTemplate(t)
    const hashtags = t.hashtags ? `\n\n${t.hashtags.join(' ')}` : ''
    setContent(t.content + hashtags)
    if (t.platform !== 'all') setPlatform(t.platform as SocialPlatform)
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Réseaux sociaux</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-text mt-1 tracking-tight flex items-center gap-2">
            <Share2 size={24} style={{ color: '#003404' }} />
            Mes publications BRH
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Déclarez vos publications LinkedIn/TikTok/Instagram pour BRH · <strong>+10 pts</strong> par publication validée
          </p>
        </div>
        {employee && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Score</p>
              <p className="font-display text-2xl font-bold" style={{ color: '#00600a' }}>{employee.activity_score} pts</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Ce mois</p>
              <p className="font-display text-2xl font-bold text-text">{monthPosts}</p>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="font-display text-base font-bold mb-3">Déclarer une publication</h2>

          <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
            Plateforme
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PLATFORMS.slice(0, 3).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlatform(p.key)}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                  platform === p.key ? 'border-emerald-600 bg-emerald-50' : 'border-border bg-white hover:border-emerald-200'
                }`}
                style={platform === p.key ? { color: p.color } : {}}
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.initials}
                </span>
                {p.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
            URL de la publication *
          </label>
          <input
            type="url"
            placeholder="https://www.linkedin.com/posts/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 mb-3"
          />

          <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
            Contenu (optionnel — pour mémoire ou template inspiration)
          </label>
          <textarea
            rows={5}
            placeholder="Collez le contenu de votre publication ici (facultatif)…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 mb-4 font-mono"
          />

          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!url.trim() || submitMutation.isPending}
            className="w-full px-6 py-3 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#00600a' }}
          >
            {submitMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Enregistrer ma publication · +10 pts
          </button>
        </div>

        {/* Templates inspiration */}
        <div>
          <h2 className="font-display text-base font-bold mb-3">Templates d'inspiration</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border bg-surface p-6 text-center">
                <p className="text-sm text-text-muted">Aucun template pour cette plateforme</p>
              </div>
            )}
            {filteredTemplates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-bold text-text leading-tight">{tpl.title}</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                    {tpl.platform === 'all' ? 'Multi' : tpl.platform}
                  </span>
                </div>
                <pre className="text-[12px] text-text-muted font-sans whitespace-pre-wrap mb-2 leading-snug max-h-32 overflow-hidden">
                  {tpl.content}
                </pre>
                {tpl.hashtags && (
                  <p className="text-[11px] text-blue-600 mb-3 leading-snug">{tpl.hashtags.join(' ')}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyTemplate(tpl.content, tpl.hashtags)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border border-border bg-white hover:border-emerald-300 text-xs font-semibold transition"
                  >
                    {copied === tpl.content.slice(0, 20) ? (
                      <><CheckCircle2 size={12} /> Copié</>
                    ) : (
                      <><Copy size={12} /> Copier</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => useTemplate(tpl)}
                    className="flex-1 px-3 py-1.5 rounded-md text-white text-xs font-bold transition hover:opacity-90"
                    style={{ backgroundColor: '#00600a' }}
                  >
                    Utiliser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historique */}
      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
            <Award size={16} /> Mes publications récentes ({totalPosts})
          </h2>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {recent.slice(0, 10).map((pub) => {
              const platMeta = PLATFORMS.find((p) => p.key === pub.platform)
              return (
                <div key={pub.id} className="p-3 flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: platMeta?.color ?? '#71717a' }}
                  >
                    <span className="text-[11px] font-bold">{platMeta?.initials ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text leading-snug line-clamp-2">{pub.content_text}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                      <span>{new Date(pub.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {pub.publication_url && (
                        <a href={pub.publication_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 inline-flex items-center gap-0.5 hover:underline">
                          Voir <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border whitespace-nowrap ${
                      pub.status === 'validated'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : pub.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {pub.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
