/**
 * Liste des audits DPE — réservée pro RGE.
 */

import { Link } from 'react-router-dom'
import { Plus, FileText, Trash2, Edit, Lock } from 'lucide-react'
import { useAudits, useDeleteAudit } from '@/hooks/queries/audits'
import type { EtiquetteDpe } from '@/lib/dpe-engine/constants'

const ETIQUETTE_BG: Record<EtiquetteDpe, string> = {
  A: 'bg-[#319834] text-white',
  B: 'bg-[#33CC33] text-white',
  C: 'bg-[#CCCC33] text-black',
  D: 'bg-[#FFCC33] text-black',
  E: 'bg-[#FF9933] text-white',
  F: 'bg-[#FF6633] text-white',
  G: 'bg-[#FF3333] text-white',
}

export default function ProAuditsList() {
  const { data: audits, isLoading, error } = useAudits()
  const deleteAudit = useDeleteAudit()

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cet audit ? Action irréversible.')) return
    deleteAudit.mutate(id)
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audits énergétiques</h1>
          <p className="mt-1 text-sm text-gray-500">
            Audits DPE 3CL conformes à l'arrêté du 8 octobre 2021
          </p>
        </div>
        <Link
          to="/pro/audits/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          <Plus className="h-4 w-4" />
          Nouvel audit
        </Link>
      </div>

      {isLoading && <div className="text-gray-500">Chargement…</div>}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Erreur : {String(error)}
        </div>
      )}

      {audits && audits.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun audit</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer un audit énergétique.</p>
          <Link
            to="/pro/audits/nouveau"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />
            Créer un audit
          </Link>
        </div>
      )}

      {audits && audits.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  CEP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  GES
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Étiquettes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {audits.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {new Date(a.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {a.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                        <Edit className="h-3 w-3" /> Brouillon
                      </span>
                    )}
                    {a.status === 'submitted' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        <Lock className="h-3 w-3" /> Finalisé
                      </span>
                    )}
                    {a.status === 'archived' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Archivé
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {a.cep_kwh_ep_m2_an
                      ? `${Math.round(a.cep_kwh_ep_m2_an)} kWh EP/m²·an`
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {a.ges_kg_co2_m2_an ? `${a.ges_kg_co2_m2_an.toFixed(0)} kg CO₂` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-1">
                      {a.etiquette_energie && (
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded text-sm font-black ${ETIQUETTE_BG[a.etiquette_energie as EtiquetteDpe]}`}
                          title={`Énergie ${a.etiquette_energie}`}
                        >
                          {a.etiquette_energie}
                        </span>
                      )}
                      {a.etiquette_climat && (
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded text-sm font-black ${ETIQUETTE_BG[a.etiquette_climat as EtiquetteDpe]}`}
                          title={`Climat ${a.etiquette_climat}`}
                        >
                          {a.etiquette_climat}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <Link
                      to={`/pro/audits/${a.id}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-green-700 hover:bg-green-50"
                    >
                      Ouvrir
                    </Link>
                    {a.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
