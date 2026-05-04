-- =============================================================================
-- Cache études prospects (sortie complète du simulateur 8915)
-- =============================================================================
-- Permet au portail agence de consulter les études (DPE, scénarios, aides,
-- isolation, DVF, owner) sans dépendre du déploiement d'une Edge Function.
--
-- Population : script Node depuis le VPS qui fetch /api/prospect/{id} pour
-- les ~500 prospects scorés et insert/update la table.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS brh_prospect_studies (
  prospect_id BIGINT PRIMARY KEY REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  study_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'simulateur-8915'
);

CREATE INDEX IF NOT EXISTS brh_prospect_studies_fetched
  ON brh_prospect_studies(fetched_at DESC);

ALTER TABLE brh_prospect_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prospect_studies_select_pro_admin ON brh_prospect_studies;
CREATE POLICY prospect_studies_select_pro_admin ON brh_prospect_studies
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('pro','admin'))
  );

DROP POLICY IF EXISTS prospect_studies_select_agence ON brh_prospect_studies;
CREATE POLICY prospect_studies_select_agence ON brh_prospect_studies
  FOR SELECT TO authenticated
  USING (public.brh_user_is_active_agence_signer());

DROP POLICY IF EXISTS prospect_studies_admin_all ON brh_prospect_studies;
CREATE POLICY prospect_studies_admin_all ON brh_prospect_studies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMENT ON TABLE brh_prospect_studies IS
  'Cache des études énergétiques complètes (DPE, scénarios S1/S2/S3, aides MPR par décile, isolation, DVF, owner). Source : simulateur BRH port 8915 /api/prospect/{id}. Population batch via script Node VPS.';

COMMIT;

SELECT 'brh_prospect_studies created' AS status;
