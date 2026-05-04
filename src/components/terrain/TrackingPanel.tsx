/**
 * Phase R10 — Panel "tracking commercial" prêt à intégrer dans toute fiche
 * (prospect / artisan / agence).
 *
 * Combine :
 *   - <ContactButtons>            (appel / email / message in-app)
 *   - bouton "Logger une visite"  (ouvre <LogVisitModal>)
 *   - <VisitHistoryList>          (historique des visites pour cette cible)
 *
 * Drop-in usage :
 *
 *   <TrackingPanel
 *     targetType="prospect_dpe"
 *     targetId={String(prospect.id)}
 *     targetLabel={`${prospect.commune} (${prospect.code_postal})`}
 *     email={prospect.email}
 *     phone={prospect.telephone}
 *     lat={prospect.latitude}
 *     lng={prospect.longitude}
 *   />
 */
import { useState } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { useMyMembership } from '@/hooks/queries/membership'
import { ContactButtons } from '@/components/shared/ContactButtons'
import { LogVisitModal } from '@/components/terrain/LogVisitModal'
import { VisitHistoryList } from '@/components/terrain/VisitHistoryList'
import type { VisitTargetType } from '@/api/field-visits'

interface TrackingPanelProps {
  targetType: VisitTargetType
  targetId: string
  targetLabel: string
  email?: string | null
  phone?: string | null
  internalProfileId?: string | null
  lat?: number | null
  lng?: number | null
  /** Affichage compact (1 ligne par visite). */
  compact?: boolean
}

export function TrackingPanel({
  targetType,
  targetId,
  targetLabel,
  email,
  phone,
  internalProfileId,
  lat,
  lng,
  compact = false,
}: TrackingPanelProps) {
  const { data: membership } = useMyMembership()
  const [logOpen, setLogOpen] = useState(false)

  return (
    <section className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList size={16} className="text-primary" /> Suivi commercial
        </h3>
        {membership?.companyId ? (
          <button
            onClick={() => setLogOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary-dark"
          >
            <Plus size={12} /> Logger visite
          </button>
        ) : null}
      </header>

      <ContactButtons
        email={email}
        phone={phone}
        internalProfileId={internalProfileId}
        size="sm"
      />

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Historique
        </p>
        <VisitHistoryList
          targetType={targetType}
          targetId={targetId}
          companyId={membership?.companyId}
          compact={compact}
        />
      </div>

      {membership?.companyId ? (
        <LogVisitModal
          open={logOpen}
          onClose={() => setLogOpen(false)}
          companyId={membership.companyId}
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          defaultLat={lat}
          defaultLng={lng}
          onSuccess={() => setLogOpen(false)}
        />
      ) : null}
    </section>
  )
}
