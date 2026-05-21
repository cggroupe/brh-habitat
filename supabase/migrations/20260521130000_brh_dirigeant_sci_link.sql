-- 2026-05-21 — Phase 2B — Table de liaison brh_dirigeant_sci + fix perf B9
--
-- CONTEXTE :
--   Bug B9 (docs/wiki/bugs-ouverts.md) — RPC brh_dirigeants_search timeout
--   >8s sur combinaison `département + autre filtre`. Cause :
--   `EXISTS (SELECT FROM jsonb_array_elements(d.sci_dirigees)
--             JOIN brh_sci_companies s ON s.siren = sci->>'siren'
--             WHERE s.departement = p_dept)`
--   Sur 80 844 dirigeants × 1-N SCI chacun = full scan combinatoire.
--
-- SOLUTION :
--   Table de liaison plate `brh_dirigeant_sci(dirigeant_id, siren,
--   departement, qualite, is_active)` indexée sur (departement, dirigeant_id)
--   et (siren). La RPC réécrite (M-5 dans 20260521140000) utilise JOIN
--   simple O(log n) au lieu de jsonb_array_elements full-scan.
--
-- LIENS :
--   - Spec : docs/wiki/hub-sci-dirigeant.md §5
--   - Bug : docs/wiki/bugs-ouverts.md (B9)
--   - RPC v2 réécrite : 20260521140000

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table de liaison
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brh_dirigeant_sci (
  dirigeant_id  uuid NOT NULL REFERENCES public.brh_dirigeants(id) ON DELETE CASCADE,
  siren         text NOT NULL,
  denomination  text,
  qualite       text,
  is_active     boolean NOT NULL DEFAULT TRUE,
  departement   text,
  date_creation date,
  forme_juridique text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dirigeant_id, siren)
);

COMMENT ON TABLE public.brh_dirigeant_sci IS
  'Table de liaison plate entre brh_dirigeants et brh_sci_companies. Évite le full-scan jsonb_array_elements dans les recherches. Reconstruite par brh_dirigeant_sci_rebuild() lors du batch recompute.';

CREATE INDEX IF NOT EXISTS idx_brh_dirigeant_sci_dept
  ON public.brh_dirigeant_sci (departement, dirigeant_id);

CREATE INDEX IF NOT EXISTS idx_brh_dirigeant_sci_siren
  ON public.brh_dirigeant_sci (siren);

CREATE INDEX IF NOT EXISTS idx_brh_dirigeant_sci_active_dept
  ON public.brh_dirigeant_sci (departement, dirigeant_id)
  WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS — admin / pro / employe (mêmes règles que les autres tables internes)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dirigeant_sci ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brh_dirigeant_sci_select ON public.brh_dirigeant_sci;
CREATE POLICY brh_dirigeant_sci_select
  ON public.brh_dirigeant_sci
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fonction de rebuild — appelée lors du batch recompute
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.brh_dirigeant_sci_rebuild()
RETURNS TABLE (
  rows_inserted bigint,
  duration_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start timestamptz := clock_timestamp();
  v_rows bigint;
BEGIN
  -- Vérification accès admin uniquement (rebuild = opération coûteuse)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = '42501';
  END IF;

  -- Rebuild atomique : TRUNCATE + INSERT
  TRUNCATE TABLE public.brh_dirigeant_sci;

  INSERT INTO public.brh_dirigeant_sci (
    dirigeant_id, siren, denomination, qualite, is_active,
    departement, date_creation, forme_juridique
  )
  SELECT
    d.id,
    (sci->>'siren')::text,
    (sci->>'denomination')::text,
    (sci->>'qualite')::text,
    coalesce((sci->>'is_active')::boolean, TRUE),
    s.departement,
    coalesce((sci->>'date_creation')::date, s.date_creation),
    coalesce((sci->>'forme_juridique')::text, s.forme_juridique)
  FROM public.brh_dirigeants d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.sci_dirigees, '[]'::jsonb)) AS sci
  LEFT JOIN public.brh_sci_companies s ON s.siren = (sci->>'siren')
  WHERE sci->>'siren' IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN QUERY SELECT v_rows,
    EXTRACT(milliseconds FROM clock_timestamp() - v_start)::numeric;
END;
$$;

COMMENT ON FUNCTION public.brh_dirigeant_sci_rebuild() IS
  'Reconstruit la table de liaison brh_dirigeant_sci à partir des JSONB sci_dirigees de brh_dirigeants. À appeler après chaque batch recompute. Admin only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Population initiale (au lieu d'appeler le rebuild — pas d'auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.brh_dirigeant_sci (
  dirigeant_id, siren, denomination, qualite, is_active,
  departement, date_creation, forme_juridique
)
SELECT
  d.id,
  (sci->>'siren')::text,
  (sci->>'denomination')::text,
  (sci->>'qualite')::text,
  coalesce((sci->>'is_active')::boolean, TRUE),
  s.departement,
  coalesce((sci->>'date_creation')::date, s.date_creation),
  coalesce((sci->>'forme_juridique')::text, s.forme_juridique)
FROM public.brh_dirigeants d
CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.sci_dirigees, '[]'::jsonb)) AS sci
LEFT JOIN public.brh_sci_companies s ON s.siren = (sci->>'siren')
WHERE sci->>'siren' IS NOT NULL
ON CONFLICT (dirigeant_id, siren) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Smoke test : vérifier que la table contient bien des données
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count bigint;
  v_dirigeants_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.brh_dirigeant_sci;
  SELECT count(*) INTO v_dirigeants_count FROM public.brh_dirigeants WHERE jsonb_array_length(coalesce(sci_dirigees, '[]'::jsonb)) > 0;
  RAISE NOTICE 'brh_dirigeant_sci populée: % rows pour % dirigeants ayant au moins 1 SCI', v_count, v_dirigeants_count;
  IF v_count < 1000 THEN
    RAISE EXCEPTION 'Backfill anormalement bas: % rows seulement', v_count;
  END IF;
END $$;
