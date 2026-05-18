-- 2026-05-18 — Table d'enrichissement signaux d'intention pour leads BRH.
--
-- Source : entity-hub signals.intention_travaux / intention_succession / intention_vente.
-- Cible Supabase pour permettre l'affichage en temps réel sur la fiche adresse.
--
-- Pipeline : script /opt/stack/scripts/brh-import-intentions.py (matching
-- brh_dpe_prospects.id → core.address.entity_id via fuzzy adresse_ban + CP).

CREATE TABLE IF NOT EXISTS public.brh_intention_signals (
  dpe_id integer PRIMARY KEY REFERENCES public.brh_dpe_prospects(id) ON DELETE CASCADE,
  -- Signaux principaux (0-100)
  score_travaux smallint CHECK (score_travaux BETWEEN 0 AND 100),
  score_vente smallint CHECK (score_vente BETWEEN 0 AND 100),
  score_succession smallint CHECK (score_succession BETWEEN 0 AND 100),
  -- Breakdown JSONB pour les détails (permis actifs, etc.)
  breakdown_travaux jsonb,
  breakdown_vente jsonb,
  breakdown_succession jsonb,
  -- Métadonnées
  matched_entity_id uuid,
  match_confidence numeric(3,2),
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brh_intention_score_travaux
  ON public.brh_intention_signals (score_travaux DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_brh_intention_score_vente
  ON public.brh_intention_signals (score_vente DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_brh_intention_score_succession
  ON public.brh_intention_signals (score_succession DESC NULLS LAST);

ALTER TABLE public.brh_intention_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intentions_select_authenticated" ON public.brh_intention_signals
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.brh_intention_signals
  IS '2026-05-18 — Signaux d''intention (travaux/vente/succession) répliqués depuis entity-hub. Match dpe_id → entity_id par adresse_ban fuzzy.';
