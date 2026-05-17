/**
 * ArtisanLeadsV2 — version unifiée (refonte UX 2026-05-17).
 * Profil RGPD : 'artisan' = vue technique DPE+isolation+ventilation, sans PII.
 */
import UnifiedLeadsView from '@/components/leads/UnifiedLeadsView'

export default function ArtisanLeadsV2() {
  return <UnifiedLeadsView profile="artisan" title="Leads chantiers RGE — Vue unifiée" />
}
