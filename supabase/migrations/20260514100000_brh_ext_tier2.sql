-- Migration Phase 11.2 — Tier 2 contextualisation (aides locales ANIL + Sit@del2 + DVF parcelle)
-- Référence : docs/wiki/external-data-sources.md § Tier 2

-- ============================================================================
-- ALTER brh_ext_commune — ajouts Sit@del2 + DVF
-- ============================================================================
-- (la colonne Sit@del2 nb_dp_logements_existants_12m existe déjà depuis tier1)
-- On ajoute :
--   - prix_m2_median_3y (DVF)  — médiane prix m² appartements/maisons sur 3 ans
--   - prix_m2_growth_3y (DVF)  — variation prix m² 3 ans (gentrification)
--   - dvf_last_refresh         — date dernier import DVF

ALTER TABLE brh_ext_commune
  ADD COLUMN IF NOT EXISTS prix_m2_median_3y NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS prix_m2_growth_3y NUMERIC(5, 4),  -- 0.18 = +18%
  ADD COLUMN IF NOT EXISTS dvf_last_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sitadel2_last_refresh TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS brh_ext_commune_growth ON brh_ext_commune(prix_m2_growth_3y DESC)
  WHERE prix_m2_growth_3y IS NOT NULL;

-- ============================================================================
-- brh_ext_aides_anil — aides locales scrappées ANIL Bretagne
-- (étend la seed brh_aides_locales nationale Phase 10)
-- ============================================================================
CREATE TABLE brh_ext_aides_anil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Périmètre
  niveau TEXT NOT NULL CHECK (niveau IN ('commune', 'epci', 'departement', 'region')),
  code_geo TEXT NOT NULL,             -- ex: '35238' (commune), '243500139' (EPCI), '35' (dépt), '53' (région)

  -- Aide
  nom_aide TEXT NOT NULL,
  organisme TEXT,                     -- 'Conseil régional Bretagne', 'Brest Métropole', etc.
  geste_concerne TEXT[],              -- ['isolation_combles', 'pac_air_eau', ...]
  montant_max_eur NUMERIC(10, 2),
  conditions TEXT,
  url_source TEXT,

  -- Méta
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_ext_aides_anil_geo ON brh_ext_aides_anil(niveau, code_geo);
CREATE INDEX brh_ext_aides_anil_geste ON brh_ext_aides_anil USING GIN (geste_concerne);

COMMENT ON TABLE brh_ext_aides_anil IS
  'Aides locales scrappées ANIL Bretagne (Phase 11.2). Complète brh_aides_locales (Phase 10 seed manuel). Réfresh trimestriel.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE brh_ext_aides_anil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_aides_anil" ON brh_ext_aides_anil FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('pro', 'admin')
    )
  );

CREATE POLICY "admin_write_aides_anil" ON brh_ext_aides_anil FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- ALTER brh_dpe_prospects — colonnes DVF déjà ajoutées en tier1 (dvf_mutation_24m).
-- On ajoute juste prix_m2_3y_growth pour la règle gentrification.
-- (en réalité, ces données sont sur la commune, pas le prospect — on garde la
-- jointure runtime. Pas d'ALTER ici.)
-- ============================================================================
