-- =============================================================================
-- Phase 16.1 — Attribution lead contact à une agence (vitrine QR)
-- =============================================================================
--
-- Quand un prospect scanne le QR vitrine d'une agence et atterrit sur
-- /contact?agence=<id>, le formulaire doit pouvoir tagger le lead avec
-- l'agence d'origine pour que BRH puisse :
--   1. Attribuer le lead à l'agence (claim auto)
--   2. Tracer la source (analytics, ROI QR codes)
--
-- Une seule colonne suffit. RLS inchangé : l'INSERT public sur brh_contacts
-- accepte déjà n'importe quel champ texte (form public).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE brh_contacts
  ADD COLUMN IF NOT EXISTS referred_by_agence_id UUID
  REFERENCES brh_agences_immo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS brh_contacts_referred_agence_idx
  ON brh_contacts(referred_by_agence_id)
  WHERE referred_by_agence_id IS NOT NULL;

COMMENT ON COLUMN brh_contacts.referred_by_agence_id IS
  'Phase 16.1 — agence d''origine (vitrine QR /a/:id). NULL = trafic direct.';

COMMIT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='brh_contacts' AND column_name='referred_by_agence_id';
