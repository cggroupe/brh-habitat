/**
 * Phase 18.4 — Skeleton vitrine pro polymorphe `/reseau/profil/:slug`.
 *
 * V1 (Étape 5) : extension de `AgenceVitrinePage` pour gérer les 4 personae.
 * Affiche profil + endorsements + posts + (Étape 8) recommandations AUTAF read-only.
 */
import { useParams } from 'react-router-dom'
import { User, Sparkles } from 'lucide-react'

export default function ReseauProfil() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display text-slate-900">Profil pro</h1>
          <p className="text-sm text-slate-500">slug : {slug ?? '—'}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
        <Sparkles size={32} className="mx-auto text-cyan-500 mb-3" />
        <h2 className="font-semibold text-slate-800">Bientôt disponible — Étape 5 du plan</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Vitrine polymorphe (extension AgenceVitrinePage) : header pro + métiers tags +
          endorsements reçus + posts récents + recommandations AUTAF (Étape 8).
        </p>
      </div>
    </div>
  )
}
