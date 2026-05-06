/**
 * Phase 18.4 — Skeleton marketplace chantiers `/reseau/chantiers`.
 *
 * KILLER feature. Implémentation : Étape 7 (publication, matching auto Haversine,
 * candidatures, sélection, commission 5% HT à signature devis via trigger).
 */
import { Briefcase, Sparkles, PlusCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ReseauChantiers() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display">Marketplace chantiers</h1>
            <p className="text-sm text-slate-500">Trouver un co-traitant ou proposer un chantier</p>
          </div>
        </div>
        <Link
          to="/reseau/chantiers/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition"
        >
          <PlusCircle size={16} /> Proposer un chantier
        </Link>
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
        <Sparkles size={32} className="mx-auto text-cyan-500 mb-3" />
        <h2 className="font-semibold text-slate-800">KILLER feature — Bientôt disponible Étape 7</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Liste des chantiers ouverts, filtres métier+ville+budget, carte Leaflet,
          workflow candidature → sélection → thread message auto → trigger commission 5% HT
          (réutilise <code className="text-xs bg-slate-100 px-1 rounded">brh_commission_invoices</code>).
        </p>
      </div>
    </div>
  )
}
