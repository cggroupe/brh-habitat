-- Migration: Ajout tracking referral sur diagnostics + appointments
-- Date: 2026-04-03
-- Permet de tracer qu'un diagnostic/RDV vient d'un lien affilie

ALTER TABLE brh_diagnostics ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE brh_appointments ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Index pour retrouver rapidement les diagnostics par referral
CREATE INDEX IF NOT EXISTS idx_brh_diagnostics_referral ON brh_diagnostics(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brh_appointments_referral ON brh_appointments(referral_code) WHERE referral_code IS NOT NULL;
