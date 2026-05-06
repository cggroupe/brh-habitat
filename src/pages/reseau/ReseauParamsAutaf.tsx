/**
 * Phase 18.4 — Skeleton bridge AUTAF `/reseau/parametres/autaf`.
 *
 * Implémentation : Étape 8 du plan. OAuth flow vers AUTAF WordPress
 * (autaf/v1/oauth/authorize), stockage token chiffré dans `brh_autaf_link`,
 * cross-post BRH → AUTAF, lecture recommandations AUTAF read-only.
 *
 * Dépendance : confirmer dispo endpoints API AUTAF avec dev Genesii.
 */
import { Link2, Sparkles, ExternalLink } from 'lucide-react'

export default function ReseauParamsAutaf() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <Link2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Bridge AUTAF</h1>
          <p className="text-sm text-slate-500">Connecter mon compte AUTAF (autaf.fr)</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50/40 p-4 text-sm text-amber-900">
        <strong>Note :</strong> AUTAF (WorkRepublic) reste autonome sur WordPress OVH.
        Le bridge est un lien optionnel : si activé, vos posts BRH peuvent être
        cross-postés sur AUTAF, et les recommandations AUTAF s'affichent sur votre profil pro BRH.
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
        <Sparkles size={32} className="mx-auto text-cyan-500 mb-3" />
        <h2 className="font-semibold text-slate-800">Bientôt disponible — Étape 8 du plan</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          OAuth flow vers AUTAF (autaf/v1/oauth/authorize), token chiffré dans
          <code className="text-xs bg-slate-100 px-1 rounded mx-1">brh_autaf_link</code>,
          EFs autaf-link-callback + autaf-cross-post,
          hook useAutafRecommendations(autaf_user_id).
        </p>
        <a
          href="https://www.autaf.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-4 text-cyan-600 hover:text-cyan-700 text-sm font-semibold"
        >
          Voir AUTAF.fr <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
