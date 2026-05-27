-- =============================================================================
-- 2026-05-27 — Sprint 1.7 : ajouter psy_profile JSONB à brh_dirigeants
-- =============================================================================
--
-- Stocke un "Profil psycho-commercial" structuré généré par Claude depuis :
--   - patrimoine SCI + autres entreprises
--   - statut dirigeant (utility vs patrimoniale)
--   - signaux décès / succession
--   - contacts pro (tel/email/LinkedIn)
--
-- Format JSONB attendu :
--   {
--     "version": "1.0",
--     "generated_at": "2026-05-27T10:00:00Z",
--     "model": "claude-opus-4-7",
--     "summary": "Court résumé 2-3 phrases (profil commercial)",
--     "motivations": ["motivation 1", "motivation 2", "motivation 3"],
--     "pain_points": ["pain 1", "pain 2"],
--     "best_approach": "Phrase d'accroche commerciale recommandée",
--     "red_flags": ["flag 1"]
--   }
-- =============================================================================

ALTER TABLE public.brh_dirigeants
  ADD COLUMN IF NOT EXISTS psy_profile jsonb,
  ADD COLUMN IF NOT EXISTS psy_profile_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS brh_dirigeants_psy_profile_idx
  ON public.brh_dirigeants ((psy_profile IS NOT NULL));

COMMENT ON COLUMN public.brh_dirigeants.psy_profile IS
  '2026-05-27 — Profil psycho-commercial structuré (Claude). NULL = pas encore généré.';
COMMENT ON COLUMN public.brh_dirigeants.psy_profile_generated_at IS
  '2026-05-27 — Timestamp de génération (TTL 30j recommandé avant régénération).';
