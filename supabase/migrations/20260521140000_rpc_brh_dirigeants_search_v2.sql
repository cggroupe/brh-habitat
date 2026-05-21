-- 2026-05-21 — Phase 2B — RPC brh_dirigeants_search v2 (fix B9)
--
-- CONTEXTE :
--   Réécriture du RPC pour utiliser la table de liaison brh_dirigeant_sci
--   créée en 20260521130000. Élimine le full-scan jsonb_array_elements +
--   JOIN brh_sci_companies pour le filtre département.
--
-- CHANGEMENTS PAR RAPPORT À v1 :
--   1. Filtre département : EXISTS sur brh_dirigeant_sci indexé
--      (departement, dirigeant_id) au lieu de jsonb_array_elements
--   2. Filtre recherche dénomination : utilise brh_dirigeant_sci.denomination
--      (indexable via trigram si besoin futur) au lieu de jsonb scan
--   3. Signature INCHANGÉE — aucun breaking change côté UI
--
-- PERF ATTENDUE :
--   Avant : >8s sur (dept + autre filtre)
--   Après : <500ms cible (JOIN sur 2 tables indexées O(log n))
--
-- LIENS :
--   - Bug : docs/wiki/bugs-ouverts.md (B9)
--   - Table liaison : 20260521130000_brh_dirigeant_sci_link.sql

CREATE OR REPLACE FUNCTION public.brh_dirigeants_search(
  p_query text DEFAULT NULL,
  p_dept text DEFAULT NULL,
  p_multi_sci boolean DEFAULT false,
  p_proprio_dpe boolean DEFAULT false,
  p_succession boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  date_naissance date,
  nb_sci_dirigees integer,
  nb_sci_actives integer,
  nb_dpe_total integer,
  est_decede boolean,
  succession_potentielle boolean,
  interet_brh text,
  sci_dirigees jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT d.*
    FROM public.brh_dirigeants d
    WHERE (NOT p_multi_sci OR d.nb_sci_dirigees >= 2)
      AND (NOT p_proprio_dpe OR d.nb_dpe_total > 0)
      AND (NOT p_succession OR d.succession_potentielle)
      AND (
        p_query IS NULL OR p_query = ''
        OR d.nom_norm LIKE lower(p_query) || '%'
        OR d.prenom_norm LIKE lower(p_query) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.brh_dirigeant_sci ds
          WHERE ds.dirigeant_id = d.id
            AND lower(ds.denomination) LIKE '%' || lower(p_query) || '%'
        )
      )
      AND (
        p_dept IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.brh_dirigeant_sci ds
          WHERE ds.dirigeant_id = d.id
            AND ds.departement = p_dept
        )
      )
  ),
  cnt AS (SELECT COUNT(*) AS n FROM filtered)
  SELECT f.id, f.nom, f.prenom, f.date_naissance, f.nb_sci_dirigees, f.nb_sci_actives,
         f.nb_dpe_total, f.est_decede, f.succession_potentielle, f.interet_brh,
         f.sci_dirigees, cnt.n
  FROM filtered f, cnt
  ORDER BY f.nb_dpe_total DESC, f.nb_sci_dirigees DESC, f.nom
  LIMIT LEAST(p_limit, 200) OFFSET GREATEST(0, p_offset);
END;
$$;

COMMENT ON FUNCTION public.brh_dirigeants_search(text, text, boolean, boolean, boolean, integer, integer) IS
  'Recherche dirigeants v2 — utilise brh_dirigeant_sci pour filtre département (fix B9 perf, cible <500ms).';

GRANT EXECUTE ON FUNCTION public.brh_dirigeants_search(text, text, boolean, boolean, boolean, integer, integer) TO authenticated;
