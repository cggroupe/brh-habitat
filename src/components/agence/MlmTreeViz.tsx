/**
 * Phase 11.7 — Visualisation arbre MLM 5 niveaux (refonte UX 2026-05-08).
 *
 * Affiche l'arbre de parrainage de l'agence connectée jusqu'à 5 niveaux
 * de profondeur avec react-d3-tree. Coloration par niveau, hover = stats.
 */
import { useMemo, useRef, useEffect, useState } from 'react'
import Tree from 'react-d3-tree'
import type { MlmTreeNode } from '@/api/agence-leaderboard'

interface MlmTreeVizProps {
  nodes: MlmTreeNode[]
}

interface D3TreeNode {
  name: string
  attributes?: {
    commune: string
    leads: string
    filleuls: string
    level: string
  }
  meta?: MlmTreeNode
  children?: D3TreeNode[]
}

const LEVEL_COLORS = ['#062a0d', '#0f7a2a', '#16a34a', '#86efac', '#dcfce7', '#f0fdf4']

function buildTree(flatNodes: MlmTreeNode[]): D3TreeNode | null {
  if (flatNodes.length === 0) return null
  const root = flatNodes.find((n) => n.level === 0)
  if (!root) return null

  function build(parent: MlmTreeNode): D3TreeNode {
    const children = flatNodes.filter((n) => n.parent_agence_id === parent.agence_id)
    return {
      name: parent.raison_sociale,
      attributes: {
        commune: parent.commune ?? '—',
        leads: String(parent.leads_signes),
        filleuls: String(parent.total_filleuls),
        level: `Niveau ${parent.level}`,
      },
      meta: parent,
      children: children.length > 0 ? children.map(build) : undefined,
    }
  }
  return build(root)
}

export default function MlmTreeViz({ nodes }: MlmTreeVizProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState({ x: 200, y: 60 })

  useEffect(() => {
    if (containerRef.current) {
      const dim = containerRef.current.getBoundingClientRect()
      setTranslate({ x: dim.width / 2, y: 70 })
    }
  }, [])

  const tree = useMemo(() => buildTree(nodes), [nodes])

  if (!tree) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center">
        <p className="text-[13px] font-medium text-text">Aucun arbre MLM</p>
        <p className="text-[12px] text-text-muted mt-1">
          Vous n'avez pas encore de filleul. Partagez votre lien parrainage pour démarrer.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="bg-surface border border-border rounded-lg overflow-hidden"
      style={{ height: 480 }}
    >
      <Tree
        data={tree}
        orientation="vertical"
        translate={translate}
        zoom={0.85}
        nodeSize={{ x: 220, y: 130 }}
        separation={{ siblings: 1, nonSiblings: 1.4 }}
        pathFunc="step"
        pathClassFunc={() => 'mlm-tree-path'}
        renderCustomNodeElement={({ nodeDatum }) => {
          const meta = (nodeDatum as unknown as D3TreeNode).meta
          if (!meta) return <g />
          const fill = LEVEL_COLORS[Math.min(meta.level, LEVEL_COLORS.length - 1)]
          const isRoot = meta.level === 0
          const stroke = isRoot ? '#0f7a2a' : '#e7e5e4'
          return (
            <g>
              <rect
                x={-90}
                y={-32}
                width={180}
                height={64}
                rx={8}
                fill="white"
                stroke={stroke}
                strokeWidth={isRoot ? 2 : 1}
              />
              <circle cx={-72} cy={0} r={8} fill={fill} />
              <text
                x={-58}
                y={-8}
                fontSize={11}
                fontWeight={600}
                fill="#1c1917"
                fontFamily="Inter, sans-serif"
              >
                {nodeDatum.name.length > 22 ? nodeDatum.name.slice(0, 20) + '…' : nodeDatum.name}
              </text>
              <text
                x={-58}
                y={6}
                fontSize={9}
                fill="#57534e"
                fontFamily="Inter, sans-serif"
              >
                {meta.commune ?? '—'}
              </text>
              <text
                x={-58}
                y={20}
                fontSize={9}
                fontWeight={500}
                fill="#0f7a2a"
                fontFamily="Inter, sans-serif"
              >
                {meta.leads_signes} leads · {meta.total_filleuls} filleuls
              </text>
            </g>
          )
        }}
      />
      <style>{`
        .mlm-tree-path {
          fill: none;
          stroke: #d6d3d1;
          stroke-width: 1.5;
        }
      `}</style>
    </div>
  )
}
