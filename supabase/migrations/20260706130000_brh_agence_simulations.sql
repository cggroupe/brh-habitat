-- =============================================================================
-- Phase 16.1 — Simulations agence (sauvegarde des études manuelles + virtuelles)
-- =============================================================================
-- L'agence peut maintenant sauvegarder ses simulations énergétiques pour les
-- retrouver plus tard dans Mes leads / Mes simulations. Chaque simulation
-- conserve :
--   - inputs : le FormState complet (modifiable, ré-éditable)
--   - result : DpeResult calculé
--   - scenarios : les 3 scénarios chiffrés
--   - lien optionnel vers un lead (lead_assignment_id) ou un prospect DPE
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS brh_agence_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Liens optionnels vers le funnel
  lead_assignment_id UUID REFERENCES brh_lead_assignments(id) ON DELETE SET NULL,
  prospect_dpe_id BIGINT REFERENCES brh_dpe_prospects(id) ON DELETE SET NULL,

  -- Identité simulation
  titre TEXT NOT NULL,
  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  code_insee CHAR(5),
  notes TEXT,

  -- Contenu (JSONB pour flexibilité — inputs FormState, result DpeResult, scénarios)
  inputs JSONB NOT NULL,
  result JSONB,
  scenarios JSONB,

  -- Étiquette et conso pour preview rapide en liste
  etiquette_dpe CHAR(1),
  cep_kwh_ep_m2_an NUMERIC(8,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agence_sim_agence
  ON brh_agence_simulations(agence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_sim_lead
  ON brh_agence_simulations(lead_assignment_id) WHERE lead_assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_agence_sim_prospect
  ON brh_agence_simulations(prospect_dpe_id) WHERE prospect_dpe_id IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_brh_agence_sim_updated ON brh_agence_simulations;
CREATE TRIGGER trg_brh_agence_sim_updated
  BEFORE UPDATE ON brh_agence_simulations
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- RLS
ALTER TABLE brh_agence_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_agence_select ON brh_agence_simulations;
CREATE POLICY sim_agence_select ON brh_agence_simulations
  FOR SELECT TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sim_agence_insert ON brh_agence_simulations;
CREATE POLICY sim_agence_insert ON brh_agence_simulations
  FOR INSERT TO authenticated
  WITH CHECK (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sim_agence_update ON brh_agence_simulations;
CREATE POLICY sim_agence_update ON brh_agence_simulations
  FOR UPDATE TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sim_agence_delete ON brh_agence_simulations;
CREATE POLICY sim_agence_delete ON brh_agence_simulations
  FOR DELETE TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sim_admin_all ON brh_agence_simulations;
CREATE POLICY sim_admin_all ON brh_agence_simulations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

SELECT 'brh_agence_simulations created' AS status;
