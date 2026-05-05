-- =============================================================================
-- Phase 16.1 — Messagerie agence ↔ BRH
-- =============================================================================
--
-- L'infrastructure messagerie existe déjà (brh_message_threads + brh_messages
-- + RPC get_my_threads_enriched + Realtime). Le seul blocage : la CHECK
-- constraint sur `participant_type` n'autorise que 'pro' / 'particulier'.
--
-- Cette migration étend la liste des participants à 'agence' pour permettre
-- aux signers + employés agence d'ouvrir des threads avec l'équipe BRH.
--
-- Les RLS existantes (`participant_id = auth.uid()`) couvrent déjà ce cas
-- puisque le signer ou l'employé est authentifié comme tout autre user.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Étendre la CHECK constraint participant_type
-- ----------------------------------------------------------------------------
ALTER TABLE brh_message_threads
  DROP CONSTRAINT IF EXISTS brh_message_threads_participant_type_check;

ALTER TABLE brh_message_threads
  ADD CONSTRAINT brh_message_threads_participant_type_check
  CHECK (participant_type IN ('pro', 'particulier', 'agence', 'artisan'));

COMMENT ON CONSTRAINT brh_message_threads_participant_type_check ON brh_message_threads IS
  'Phase 16.1 — étendu à agence + artisan pour messagerie multi-portails.';

COMMIT;

-- Sanity
SELECT pg_get_constraintdef(c.oid) AS check_def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'brh_message_threads'
  AND c.conname = 'brh_message_threads_participant_type_check';
