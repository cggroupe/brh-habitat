/**
 * EmployeLeadsV2 — version unifiée (refonte UX 2026-05-17).
 * Profil RGPD : 'employe' = BRH interne, voit TOUT (PII, OSINT, scores comportementaux).
 *
 * Périmètre B8 (21/05) : cette page liste des PROSPECTS DPE F/G —
 * pas les clients BRH facturés. Voir /employe/clients-brh pour ces derniers.
 */
import UnifiedLeadsView from '@/components/leads/UnifiedLeadsView'

export default function EmployeLeadsV2() {
  return (
    <UnifiedLeadsView
      profile="employe"
      title="Prospects DPE F/G — Vue unifiée"
      subtitle="Adresses à conquérir (passoires thermiques). Pour vos contacts BRH historiques, voir Clients BRH."
    />
  )
}
