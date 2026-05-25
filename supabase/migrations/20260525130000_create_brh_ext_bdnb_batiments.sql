-- =============================================================================
-- 2026-05-25 — Phase 3.3 : table brh_ext_bdnb_batiments
-- =============================================================================
--
-- CONTEXTE (handoff-2026-05-25.md suggestion #3) :
--   Les zips BDNB Bretagne (4 dépts, 2.2M batiments) sont restaurés sur
--   PostGIS local (port 5433). On extrait les ~1.5M bâtiments avec ban_id
--   et 6 colonnes utiles pour scoring V2 typologie bâti.
--
--   La clé `ban_id` permet le JOIN exact avec brh_dpe_prospects.adresse_ban_id
--   et brh_personnes_historique.adresse_ban_id (chantiers Phase 1 / 24-25/05).
--
-- COLONNES retenues (5-10 utiles vs 200+ disponibles dans BDNB) :
--   - batiment_groupe_id : PK BDNB (préserve traçabilité)
--   - ban_id : clé de jointure (depuis batiment_groupe_adresse.cle_interop_adr_principale_ban)
--   - dept : code département (22/29/35/56)
--   - annee_construction : table ffo_bat
--   - mat_mur_txt / mat_toit_txt : typologie (PIERRE, AGGLOMERE, ARDOISES, etc.)
--   - nb_niveau : ffo_bat (smallint)
--   - nb_log : ffo_bat (nombre logements)
--   - surface_habitable_logement : dpe_repr (double)
--   - type_vitrage : dpe_repr (SIMPLE, DOUBLE, TRIPLE)
--
-- Ces 8 colonnes alimenteront 3 nouvelles règles V2 (cf migration suivante) :
--   - r_vitrage_simple : +5 pts si vitrage simple AND annee < 1990
--   - r_pierre_ancienne : +3 pts si mat_mur = pierre AND annee < 1900
--   - r_grand_logement : +3 pts si surface >= 150 AND etiquette ∈ (E,F,G)
--
-- VOLUME estimé : ~1.5M rows total (4 dépts bretons).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brh_ext_bdnb_batiments (
  batiment_groupe_id TEXT PRIMARY KEY,
  ban_id TEXT NOT NULL,
  dept VARCHAR(2) NOT NULL,
  annee_construction INTEGER,
  mat_mur_txt TEXT,
  mat_toit_txt TEXT,
  nb_niveau SMALLINT,
  nb_log INTEGER,
  surface_habitable_logement NUMERIC(12,2),  -- BDNB peut contenir des valeurs aberrantes (1M+ m²) pour bâtiments mal renseignés
  type_vitrage TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index principal : matching avec DPE / personnes via BAN id
CREATE INDEX IF NOT EXISTS brh_ext_bdnb_ban_id_idx
  ON public.brh_ext_bdnb_batiments (ban_id);

-- Index par dept pour batchs et stats par département
CREATE INDEX IF NOT EXISTS brh_ext_bdnb_dept_idx
  ON public.brh_ext_bdnb_batiments (dept);

-- Index typologie (pour requêtes de filtrage règles V2)
CREATE INDEX IF NOT EXISTS brh_ext_bdnb_annee_idx
  ON public.brh_ext_bdnb_batiments (annee_construction)
  WHERE annee_construction IS NOT NULL;

-- RLS : référentiel public (lecture seule par tous, pas de données personnelles)
ALTER TABLE public.brh_ext_bdnb_batiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brh_ext_bdnb_batiments_read_all"
  ON public.brh_ext_bdnb_batiments
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.brh_ext_bdnb_batiments IS
  'Phase 3 (25/05) — Typologie bâti BDNB Bretagne (4 dépts). Source : extract local PostGIS depuis bdnb_2025_07_a_open_data_dep{22,29,35,56}. Joint avec brh_dpe_prospects via ban_id. Alimente 3 règles V2 typologie (r_vitrage_simple, r_pierre_ancienne, r_grand_logement).';

COMMENT ON COLUMN public.brh_ext_bdnb_batiments.ban_id IS
  'cle_interop_adr_principale_ban depuis BDNB batiment_groupe_adresse — clé de jointure officielle avec brh_dpe_prospects.adresse_ban_id et brh_personnes_historique.adresse_ban_id.';
