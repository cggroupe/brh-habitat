/**
 * Phase 18.4 — Skeleton publication offre `/reseau/chantiers/nouveau`.
 * Implémentation : Étape 7 (formulaire titre + métiers + ville BAN + budget + mode).
 */
import { PlusCircle, Sparkles } from 'lucide-react'

export default function ReseauChantierNew() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <PlusCircle size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Proposer un chantier</h1>
          <p className="text-sm text-slate-500">Trouver un co-traitant ou apporter une affaire</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
        <Sparkles size={32} className="mx-auto text-cyan-500 mb-3" />
        <h2 className="font-semibold text-slate-800">Bientôt disponible — Étape 7 du plan</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Formulaire titre + métiers cherchés + ville (autocomplete BAN) + budget cents +
          date début + contract_mode (sous_traitance / co_traitance / apport) + visibility +
          import optionnel depuis un brh_prospect existant.
        </p>
      </div>
    </div>
  )
}
