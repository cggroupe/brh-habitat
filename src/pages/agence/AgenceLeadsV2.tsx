/**
 * AgenceLeadsV2 — version unifiée (refonte UX 2026-05-17).
 *
 * Remplace progressivement les 6 sous-pages cloisonnées par UN écran unifié
 * liste+filtres+toggle carte. Route accessible via `/agence/leads-v2`.
 * Profil RGPD : 'agence' = sans PII particulier (téléphone, email, OSINT).
 *
 * Cf. wiki log.md 2026-05-17.
 */
import UnifiedLeadsView from '@/components/leads/UnifiedLeadsView'

export default function AgenceLeadsV2() {
  return (
    <UnifiedLeadsView
      profile="agence"
      title="Prospects Foncier — Vue unifiée"
      subtitle="Adresses DPE F/G de votre zone — propriétaires anonymisés (RGPD). Cliquez sur une ligne pour voir les détails techniques."
    />
  )
}
