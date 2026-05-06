/**
 * Phase 16.1 Step C — Vue arbre du réseau de parrainage 5 niveaux.
 *
 * Liste indentée par niveau (niveau 1 = enfants directs, jusqu'à 5).
 * Chaque ligne montre : raison_sociale, commune, palier, cash gagné,
 * leads gagnés.
 *
 * Design system BRH : palette verte primary décroissante par niveau,
 * shadow signature, fonts DM Sans.
 */
import { Building2, Network, Euro, Sparkles } from 'lucide-react'
import { useMyReferralTree } from '@/hooks/queries/agence-referrals'

// Palette verte décroissante du primary (foncé) au primary-light (clair)
// pour les 5 niveaux. Plus on descend, plus c'est clair.
const LEVEL_BADGES = [
  'bg-primary text-white',                                    // N1 - vert foncé
  'bg-primary-green text-white',                              // N2 - vert vif
  'bg-secondary/90 text-white',                               // N3 - vert clair
  'bg-primary-light text-primary-dark',                       // N4 - vert pâle
  'bg-accent text-primary-dark',                              // N5 - vert très pâle
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
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-8 text-center">
        <p className="text-sm text-text-light">Chargement de l'arbre…</p>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Network size={26} className="text-primary" />
        </div>
        <p className="font-display text-lg text-text-primary mb-1">Votre réseau est vide</p>
        <p className="text-sm text-text-light max-w-md mx-auto">
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
    <div className="space-y-5">
      {/* Stats globales — 3 cards premium pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Network size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">
            Réseau total
          </p>
          <p className="font-display text-3xl font-bold tabular-nums text-text-primary tracking-tight">
            {totalNodes}
          </p>
          <p className="text-[11px] text-text-light mt-1">agences sur 5 niveaux</p>
        </div>

        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Euro size={18} className="text-white" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary-light mb-1">
            Cash gagné
          </p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">
            {formatEur(totalCash)}
          </p>
          <p className="text-[11px] opacity-80 mt-1">cumul du réseau</p>
        </div>

        <div className="bg-gradient-to-br from-deep to-primary-dark rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-primary-light" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary-light mb-1">
            Leads gagnés
          </p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">
            +{totalLeads}
          </p>
          <p className="text-[11px] opacity-80 mt-1">cumul du réseau</p>
        </div>
      </div>

      {/* Arborescence par niveau */}
      {levels.map((lvl) => (
        <section key={lvl}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs shrink-0 ${
                LEVEL_BADGES[lvl - 1] ?? LEVEL_BADGES[4]
              }`}
            >
              N{lvl}
            </span>
            <h3 className="font-display text-base font-bold text-text-primary tracking-tight">
              Niveau {lvl}
            </h3>
            <span className="text-xs text-text-light">
              · {byLevel[lvl].length} agence{byLevel[lvl].length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2" style={{ marginLeft: `${(lvl - 1) * 20}px` }}>
            {byLevel[lvl].map((node) => (
              <div
                key={node.agence_id}
                className="bg-white rounded-xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-text-primary truncate">
                    {node.raison_sociale ?? `Agence #${node.agence_id.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] text-text-light mt-0.5">
                    {node.commune}
                    {node.departement ? ` (${node.departement})` : ''} ·{' '}
                    {STATUS_LABELS[node.status] ?? node.status} ·{' '}
                    {new Date(node.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-sm font-bold text-primary tabular-nums">
                    {formatEur(node.cash_earned_cents)}
                  </p>
                  <p className="text-[10px] text-primary-dark font-bold tabular-nums">
                    +{node.leads_earned} leads
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Légende dégressive */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-5 mt-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
          Barème par niveau
        </p>
        <div className="grid grid-cols-5 gap-3">
          {[
            { lvl: 1, cash: '100 €', leads: '+5' },
            { lvl: 2, cash: '25 €', leads: '+3' },
            { lvl: 3, cash: '10 €', leads: '+2' },
            { lvl: 4, cash: '5 €', leads: '+1' },
            { lvl: 5, cash: '5 €', leads: '+1' },
          ].map((b) => (
            <div key={b.lvl} className="text-center">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs mb-2 ${
                  LEVEL_BADGES[b.lvl - 1]
                }`}
              >
                N{b.lvl}
              </span>
              <p className="text-xs font-display font-bold text-text-primary">{b.cash}</p>
              <p className="text-[10px] text-primary font-bold">{b.leads} leads</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-light mt-3 leading-relaxed">
          Total max par charte signée : 145 € HT + 12 leads distribués sur 5 niveaux d'ancêtres.
          Versement à la signature et activation de la charte.
        </p>
      </div>
    </div>
  )
}
