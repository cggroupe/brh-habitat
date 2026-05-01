-- Migration BRH Habitat : Audits DPE 3CL (Phase 1 DPE Engine)
-- Source : caprenov-reverse/wiki/08-implementation-brh/migrations-supabase.md (section C)
-- Date : 2026-04-30

-- IMPORTANT (règles anti-bug BRH) :
-- - INTEGER cents pour tous les montants
-- - TIMESTAMPTZ partout
-- - RLS activée + policies explicites
-- - Pas de USING (true)

-- ============================================================================
-- 1. TABLE brh_audits — Audit DPE 3CL conduit par un pro RGE
-- ============================================================================

CREATE TABLE brh_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Liens
  diagnostic_id UUID REFERENCES brh_diagnostics(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),     -- propriétaire / particulier
  pro_user_id UUID REFERENCES auth.users(id), -- artisan RGE qui a fait l'audit
  home_id UUID REFERENCES brh_homes(id) ON DELETE SET NULL,

  -- Inputs (saisie wizard 8 étapes)
  inputs JSONB NOT NULL,

  -- Outputs (calculés par dpe-engine)
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  cep_kwh_ep_m2_an NUMERIC,
  ges_kg_co2_m2_an NUMERIC,
  etiquette_energie CHAR(1) CHECK (etiquette_energie IS NULL OR etiquette_energie IN ('A','B','C','D','E','F','G')),
  etiquette_climat CHAR(1) CHECK (etiquette_climat IS NULL OR etiquette_climat IN ('A','B','C','D','E','F','G')),

  -- Méta
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','archived')),
  pdf_url TEXT,
  xml_ademe_url TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_audits_user ON brh_audits(user_id);
CREATE INDEX idx_brh_audits_pro ON brh_audits(pro_user_id);
CREATE INDEX idx_brh_audits_diagnostic ON brh_audits(diagnostic_id);
CREATE INDEX idx_brh_audits_home ON brh_audits(home_id);
CREATE INDEX idx_brh_audits_status ON brh_audits(status);

ALTER TABLE brh_audits ENABLE ROW LEVEL SECURITY;

-- Particulier voit ses audits
CREATE POLICY "user_select_own_audit" ON brh_audits FOR SELECT
  USING (user_id = auth.uid());

-- Pro voit ses audits
CREATE POLICY "pro_select_own_audits" ON brh_audits FOR SELECT
  USING (pro_user_id = auth.uid());

-- Pro peut éditer SEULEMENT ses drafts
CREATE POLICY "pro_insert_audits" ON brh_audits FOR INSERT
  WITH CHECK (pro_user_id = auth.uid() AND status = 'draft');

CREATE POLICY "pro_update_draft_audits" ON brh_audits FOR UPDATE
  USING (pro_user_id = auth.uid() AND status = 'draft')
  WITH CHECK (pro_user_id = auth.uid());

-- Admin accès complet
CREATE POLICY "admin_all_audits" ON brh_audits FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger updated_at (utilise la fonction update_updated_at déjà définie dans brh_full_schema)
CREATE TRIGGER set_updated_at_brh_audits
  BEFORE UPDATE ON brh_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. TABLE brh_audit_variantes — Scénarios de rénovation
-- ============================================================================

CREATE TABLE brh_audit_variantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES brh_audits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,

  -- ADR-004 : Variantes en delta JSONB par rapport à l'audit parent
  delta_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Résultats du recalcul
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  cep_kwh_ep_m2_an NUMERIC,
  ges_kg_co2_m2_an NUMERIC,
  etiquette_energie CHAR(1) CHECK (etiquette_energie IS NULL OR etiquette_energie IN ('A','B','C','D','E','F','G')),
  etiquette_climat CHAR(1) CHECK (etiquette_climat IS NULL OR etiquette_climat IN ('A','B','C','D','E','F','G')),

  -- Coûts travaux (INTEGER cents — règle anti-bug #2)
  cout_total_ttc_cents BIGINT,
  cout_main_oeuvre_cents BIGINT,
  cout_fournitures_cents BIGINT,

  -- Aides éligibles (JSONB array : [{type, programme_id, montant_cents}, ...])
  aides JSONB NOT NULL DEFAULT '[]'::jsonb,
  aides_total_cents BIGINT,
  reste_a_charge_cents BIGINT,

  -- ADR-005 : Payback simple = USP BRH (CapRénov+ ne le calcule pas)
  payback_annees NUMERIC,
  economie_annuelle_cents BIGINT,

  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_audit_variantes_audit ON brh_audit_variantes(audit_id);
CREATE INDEX idx_brh_audit_variantes_selected ON brh_audit_variantes(audit_id) WHERE is_selected = true;

ALTER TABLE brh_audit_variantes ENABLE ROW LEVEL SECURITY;

-- Hérite des permissions de l'audit parent (via JOIN)
CREATE POLICY "audit_owner_select_variantes" ON brh_audit_variantes FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND (a.user_id = auth.uid() OR a.pro_user_id = auth.uid()))
  );

CREATE POLICY "pro_write_draft_variantes" ON brh_audit_variantes FOR ALL
  USING (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND a.pro_user_id = auth.uid() AND a.status = 'draft')
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND a.pro_user_id = auth.uid() AND a.status = 'draft')
  );

CREATE POLICY "admin_all_variantes" ON brh_audit_variantes FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- 3. TABLE brh_audit_factures — Calage moteur sur factures réelles
-- ============================================================================

CREATE TABLE brh_audit_factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES brh_audits(id) ON DELETE CASCADE,
  energie TEXT NOT NULL CHECK (energie IN
    ('electricite','gaz_naturel','fioul','propane','bois_buche','granules_bois','reseau_chaleur')),
  annee INT NOT NULL CHECK (annee BETWEEN 2010 AND 2100),
  conso_kwh NUMERIC NOT NULL CHECK (conso_kwh >= 0),
  depense_ttc_cents BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_audit_factures_audit ON brh_audit_factures(audit_id);
CREATE INDEX idx_brh_audit_factures_energie_annee ON brh_audit_factures(audit_id, energie, annee);

ALTER TABLE brh_audit_factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_owner_select_factures" ON brh_audit_factures FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND (a.user_id = auth.uid() OR a.pro_user_id = auth.uid()))
  );

CREATE POLICY "pro_write_draft_factures" ON brh_audit_factures FOR ALL
  USING (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND a.pro_user_id = auth.uid() AND a.status = 'draft')
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM brh_audits a WHERE a.id = audit_id
      AND a.pro_user_id = auth.uid() AND a.status = 'draft')
  );

CREATE POLICY "admin_all_factures" ON brh_audit_factures FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE brh_audits IS
  'Audit énergétique 3CL-DPE 2021 (méthode arrêté 8 oct 2021). Saisie pro RGE, lecture pro+particulier. ADR-006.';
COMMENT ON TABLE brh_audit_variantes IS
  'Scénarios de rénovation. Stocké en delta JSONB vs audit parent (ADR-004).';
COMMENT ON TABLE brh_audit_factures IS
  'Factures réelles pour calage moteur (k = facture / estimé par énergie).';
