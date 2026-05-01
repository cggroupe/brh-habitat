-- Migration BRH Habitat : Catalogue de solutions DPE (prix HT + MO HT)
-- Source : caprenov-reverse/db_dumps/solutions/ (extrait de solutions.db CapRénov+)
-- Date : 2026-04-30

-- IMPORTANT (règles anti-bug BRH) :
-- - INTEGER cents pour tous les montants (règle #2)
-- - RLS activée
-- - Lecture publique (catalogue), écriture admin only

-- ============================================================================
-- TABLE brh_dpe_solutions — Catalogue des travaux types
-- ============================================================================

CREATE TABLE brh_dpe_solutions (
  id SERIAL PRIMARY KEY,

  -- Identification
  type_element TEXT NOT NULL CHECK (type_element IN (
    'PAROI', 'OUVERTURE', 'CHAUDIERE', 'PAC', 'ECS', 'EMETTEUR',
    'VENTILATION', 'ISOLATION_TOITURE', 'ISOLATION_PLANCHER_BAS',
    'ISOLATION_PLANCHER_HAUT', 'ISOLATION_MUR_ITE', 'ISOLATION_MUR_ITI',
    'PHOTOVOLTAIQUE', 'SOLAIRE_THERMIQUE', 'CET', 'AUTRE'
  )),
  label TEXT NOT NULL,

  -- Prix unitaires (cents)
  prix_unit_ht_cents INTEGER,
  prix_main_oeuvre_ht_cents INTEGER,
  prix_metre_ht_cents INTEGER,

  -- TVA applicable
  pourcentage_tva NUMERIC NOT NULL DEFAULT 5.5 CHECK (pourcentage_tva IN (5.5, 10, 20)),

  -- Paramètres techniques (lambda, R, U, COP, etc. spécifiques à la solution)
  param JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Score confort 0-100 (apprécié à la pose)
  score_confort INT CHECK (score_confort IS NULL OR (score_confort BETWEEN 0 AND 100)),

  -- Méta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_dpe_solutions_type ON brh_dpe_solutions(type_element);

ALTER TABLE brh_dpe_solutions ENABLE ROW LEVEL SECURITY;

-- Lecture publique (catalogue partagé, anon + auth)
CREATE POLICY "public_select_solutions" ON brh_dpe_solutions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Écriture admin seulement
CREATE POLICY "admin_write_solutions" ON brh_dpe_solutions FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_update_solutions" ON brh_dpe_solutions FOR UPDATE
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_delete_solutions" ON brh_dpe_solutions FOR DELETE
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_brh_dpe_solutions
  BEFORE UPDATE ON brh_dpe_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE brh_dpe_solutions IS
  'Catalogue des solutions/travaux types avec prix HT + main d''oeuvre. Source initiale : solutions.db CapRénov+.';
