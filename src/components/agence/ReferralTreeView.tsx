/**
 * Phase 16.1 Step C — Vue arbre du réseau de parrainage 5 niveaux.
 *
 * Liste indentée par niveau (niveau 1 = enfants directs, jusqu'à 5).
 * Chaque ligne montre : raison_sociale, commune, palier, cash gagné,
 * leads gagnés.
 *
 * Pas de D3 / arbre graphique — liste indentée suffit pour 5 niveaux.
 */
import { Building2, Network, Euro, Sparkles } from 'lucide-react'
import { useMyReferralTree } from '@/hooks/queries/agence-referrals'

const LEVEL_COLORS = [
  'bg-orange-100 text-orange-800 border-orange-200',     // 1
  'bg-amber-100 text-amber-800 border-amber-200',        // 2
  'bg-yellow-100 text-yellow-800 border-yellow-200',     // 3
  'bg-lime-100 text-lime-800 border-lime-200',           // 4
  'bg-emerald-100 text-emerald-800 border-emerald-200',  // 5
]

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  contacted: 'Contactée',
  partenaire: 'Partenaire ✓',
  refused: 'Refusée',
}

function formatEur(cents: number): string {
  return Math.round(cents / 100).toLocaleString('fr-FR') + ' €'
}

export default function ReferralTreeView() {
  const { data: tree = [], isLoading } = useMyReferralTree()

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500">Chargement de l'arbre…</p>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Network size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="text-slate-700 font-medium">Votre réseau est vide</p>
        <p className="text-xs text-slate-500 mt-1">
          Partagez votre lien de parrainage. Chaque charte signée par une agence parrainée vous
          rapporte du cash et des leads — sur 5 niveaux de profondeur.
        </p>
      </div>
    )
  }

  // Group par niveau
  const byLevel = tree.reduce<Record<number, typeof tree>>((acc, node) => {
    if (!acc[node.chain_level]) acc[node.chain_level] = []
    acc[node.chain_level].push(node)
    return acc
  }, {})

  const levels = Object.keys(byLevel).map(Number).sort()

  // Totaux globaux
  const totalCash = tree.reduce((s, n) => s + n.cash_earned_cents, 0)
  const totalLeads = tree.reduce((s, n) => s + n.leads_earned, 0)
  const totalNodes = tree.length

  return (
    <div className="space-y-4">
      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Network size={14} className="text-orange-600" />
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Réseau total
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-800">{totalNodes}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">agences sur 5 niveaux</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Euro size={14} />
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-90">
              Cash gagné
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatEur(totalCash)}</p>
          <p className="text-[11px] opacity-90 mt-0.5">cumul du réseau</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} />
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-90">
              Leads gagnés
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums">+{totalLeads}</p>
          <p className="text-[11px] opacity-90 mt-0.5">cumul du réseau</p>
        </div>
      </div>

      {/* Arborescence par niveau */}
      {levels.map((lvl) => (
        <section key={lvl}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-[11px] font-bold ${
                LEVEL_COLORS[lvl - 1] ?? LEVEL_COLORS[4]
              }`}
            >
              N{lvl}
            </span>
            <h3 className="font-bold text-sm text-slate-700">
              Niveau {lvl} — {byLevel[lvl].length} agence{byLevel[lvl].length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-1.5" style={{ marginLeft: `${(lvl - 1) * 16}px` }}>
            {byLevel[lvl].map((node) => (
              <div
                key={node.agence_id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">
                    {node.raison_sociale ?? `Agence #${node.agence_id.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {node.commune}
                    {node.departement ? ` (${node.departement})` : ''} ·{' '}
                    {STATUS_LABELS[node.status] ?? node.status} ·{' '}
                    {new Date(node.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-emerald-700 tabular-nums">
                    {formatEur(node.cash_earned_cents)}
                  </p>
                  <p className="text-[10px] text-orange-600 font-bold tabular-nums">
                    +{node.leads_earned} leads
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Légende dégressive */}
      <div className="bg-slate-50 rounded-xl p-4 mt-4">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">
          Barème par niveau
        </p>
        <div className="grid grid-cols-5 gap-2">
          {[
            { lvl: 1, cash: '100 €', leads: '+5' },
            { lvl: 2, cash: '25 €', leads: '+3' },
            { lvl: 3, cash: '10 €', leads: '+2' },
            { lvl: 4, cash: '5 €', leads: '+1' },
            { lvl: 5, cash: '5 €', leads: '+1' },
          ].map((b) => (
            <div key={b.lvl} className="text-center">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold mb-1 border ${
                  LEVEL_COLORS[b.lvl - 1]
                }`}
              >
                N{b.lvl}
              </span>
              <p className="text-[10px] font-bold text-slate-700">{b.cash}</p>
              <p className="text-[10px] text-orange-600 font-bold">{b.leads} leads</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Total max par charte signée : 145 € HT + 12 leads distribués sur 5 niveaux d'ancêtres.
          Versement à la signature et activation de la charte.
        </p>
      </div>
    </div>
  )
}
