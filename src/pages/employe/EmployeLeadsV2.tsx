/**
 * EmployeLeadsV2 — version unifiée (refonte UX 2026-05-17).
 * Profil RGPD : 'employe' = BRH interne, voit TOUT (PII, OSINT, scores comportementaux).
 */
import UnifiedLeadsView from '@/components/leads/UnifiedLeadsView'

export default function EmployeLeadsV2() {
  return <UnifiedLeadsView profile="employe" title="Leads BRH — Vue unifiée" />
}
