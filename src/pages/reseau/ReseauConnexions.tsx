/**
 * Phase 18.5 — Page graphe social `/reseau/connexions`.
 *
 * 3 sections : demandes reçues / mes connexions / suggestions du même département.
 * Endorsements only V1 (décision #3).
 */
import { useState } from 'react'
import { Users, Inbox, Sparkles, Network } from 'lucide-react'
import {
  useMyConnections,
  useIncomingRequests,
  useConnectionSuggestions,
  useAcceptConnection,
  useDeclineConnection,
  useSendConnectionRequest,
} from '@/hooks/queries/reseau-connections'
import ConnectionCard from '@/components/reseau/ConnectionCard'

type Tab = 'incoming' | 'connections' | 'suggestions'

export default function ReseauConnexions() {
  const [tab, setTab] = useState<Tab>('suggestions')

  const incoming = useIncomingRequests()
  const connections = useMyConnections()
  const suggestions = useConnectionSuggestions(15)

  const accept = useAcceptConnection()
  const decline = useDeclineConnection()
  const send = useSendConnectionRequest()

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display text-slate-900">Mes connexions</h1>
          <p className="text-sm text-slate-500">Demandes reçues, mon réseau, suggestions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-4 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setTab('suggestions')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'suggestions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={14} /> Suggestions
          {suggestions.data && suggestions.data.length > 0 && (
            <span className="bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded text-[10px]">{suggestions.data.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('incoming')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'incoming' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox size={14} /> Reçues
          {incoming.data && incoming.data.length > 0 && (
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">{incoming.data.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('connections')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'connections' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Network size={14} /> Mon réseau
          {connections.data && connections.data.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">{connections.data.length}</span>
          )}
        </button>
      </div>

      {/* Suggestions tab */}
      {tab === 'suggestions' && (
        <div className="space-y-2.5">
          {suggestions.isLoading && <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>}
          {!suggestions.isLoading && (suggestions.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              Aucune suggestion pour le moment. Revenez plus tard !
            </p>
          )}
          {(suggestions.data ?? []).map((s) => (
            <ConnectionCard
              key={s.partner_contract_id}
              proId={s.partner_contract_id}
              partnerType={s.partner_type}
              fullName={s.signer_full_name}
              city={s.city}
              postalCode={s.postal_code}
              departement={s.departement}
              variant="suggestion"
              loading={send.isPending}
              onSendRequest={() => send.mutate({ recipientProId: s.partner_contract_id })}
            />
          ))}
        </div>
      )}

      {/* Incoming tab */}
      {tab === 'incoming' && (
        <div className="space-y-2.5">
          {incoming.isLoading && <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>}
          {!incoming.isLoading && (incoming.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Aucune demande en attente.</p>
          )}
          {(incoming.data ?? []).map((c) => (
            <ConnectionCard
              key={c.id}
              proId={c.requester_pro_id}
              partnerType="autre"
              fullName="Demande de connexion"
              variant="incoming"
              loading={accept.isPending || decline.isPending}
              onAccept={() => accept.mutate(c.id)}
              onDecline={() => decline.mutate(c.id)}
            />
          ))}
        </div>
      )}

      {/* Connections tab */}
      {tab === 'connections' && (
        <div className="space-y-2.5">
          {connections.isLoading && <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>}
          {!connections.isLoading && (connections.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              Vous n'avez pas encore de connexion. Allez dans Suggestions pour en ajouter !
            </p>
          )}
          {(connections.data ?? []).map((c) => (
            <ConnectionCard
              key={c.id}
              proId={c.requester_pro_id}
              partnerType="autre"
              fullName="Connexion acceptée"
              variant="connection"
            />
          ))}
        </div>
      )}
    </div>
  )
}
