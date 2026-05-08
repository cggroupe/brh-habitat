/**
 * Phase 18.7 — Page publication offre `/reseau/chantiers/nouveau`.
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import ChantierForm from '@/components/reseau/ChantierForm'

export default function ReseauChantierNew() {
  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-5">
      <Link
        to="/reseau/chantiers"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Marketplace chantiers
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
          <PlusCircle size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display text-slate-900">Proposer un chantier</h1>
          <p className="text-sm text-slate-500">Décrivez votre besoin pour trouver un co-traitant</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <ChantierForm />
      </div>
    </div>
  )
}
