/**
 * Phase 18.4 — Skeleton découverte `/reseau/decouvrir`.
 *
 * Implémentation complète : Étape 11 (carte Bretagne Leaflet + filtres
 * métier/ville/disponibilité + 750 pages SEO villes×métiers build-time).
 */
import { Map, Sparkles } from 'lucide-react'

export default function ReseauDecouvrir() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <Map size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Découvrir</h1>
          <p className="text-sm text-slate-500">Pros bretons par métier et secteur</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
        <Sparkles size={32} className="mx-auto text-cyan-500 mb-3" />
        <h2 className="font-semibold text-slate-800">Bientôt disponible — Étape 11 du plan</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Carte Leaflet centrée Bretagne (chunk déjà splitté), filtres métier×ville,
          listing avec endorsement count, 750 pages SEO villes×métiers,
          schema.org LocalBusiness sur profils publics.
        </p>
      </div>
    </div>
  )
}
