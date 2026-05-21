-- 2026-05-21 — Phase 4 — RPC brh_dirigeants_search v3 (fix B6)
--
-- CONTEXTE :
--   Bug B6 (docs/wiki/bugs-ouverts.md) — sur /employe/dirigeants, le filtre
--   "Propriétaire DPE BRH" paraît inopérant car le tri par défaut est déjà
--   `nb_dpe_total DESC` → les propriétaires DPE apparaissent en tête même
--   sans le filtre, donc le top 5 visuel ne change pas (seul le compteur
--   diminue).
--
-- SOLUTION :
--   Ajouter un paramètre `p_order_by` qui permet à l'UI de choisir le tri :
--     - 'patrimoine' (défaut, comportement v2) : DPE DESC, SCI DESC, nom
--     - 'nom'                                  : nom ASC, prénom ASC (A→Z)
--     - 'sci_count'                            : SCI DESC, DPE DESC
--   L'UI passera 'nom' par défaut et 'patrimoine' quand un filtre est actif.
--
-- SIGNATURE :
--   Param `p_order_by text DEFAULT 'patrimoine'` ajouté en fin. Backward
--   compatible — les appels actuels (sans p_order_by) gardent le comportement
--   v2.

CREATE OR REPLACE FUNCTION public.brh_dirigeants_search(
  p_query text DEFAULT NULL,
  p_dept text DEFAULT NULL,
  p_multi_sci boolean DEFAULT false,
  p_proprio_dpe boolean DEFAULT false,
  p_succession boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'patrimoine'
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
          SELECT 1 FROM public.brh_dirigeant_sci ds
          WHERE ds.dirigeant_id = d.id
            AND lower(ds.denomination) LIKE '%' || lower(p_query) || '%'
        )
      )
      AND (
        p_dept IS NULL OR EXISTS (
          SELECT 1 FROM public.brh_dirigeant_sci ds
          WHERE ds.dirigeant_id = d.id AND ds.departement = p_dept
        )
      )
  ),
  cnt AS (SELECT COUNT(*) AS n FROM filtered)
  SELECT f.id, f.nom, f.prenom, f.date_naissance, f.nb_sci_dirigees, f.nb_sci_actives,
         f.nb_dpe_total, f.est_decede, f.succession_potentielle, f.interet_brh,
         f.sci_dirigees, cnt.n
  FROM filtered f, cnt
  ORDER BY
    CASE WHEN p_order_by = 'nom'       THEN f.nom END ASC NULLS LAST,
    CASE WHEN p_order_by = 'nom'       THEN f.prenom END ASC NULLS LAST,
    CASE WHEN p_order_by = 'sci_count' THEN f.nb_sci_dirigees END DESC NULLS LAST,
    CASE WHEN p_order_by = 'sci_count' THEN f.nb_dpe_total END DESC NULLS LAST,
    CASE WHEN p_order_by = 'patrimoine' OR p_order_by NOT IN ('nom', 'sci_count')
         THEN f.nb_dpe_total END DESC NULLS LAST,
    CASE WHEN p_order_by = 'patrimoine' OR p_order_by NOT IN ('nom', 'sci_count')
         THEN f.nb_sci_dirigees END DESC NULLS LAST,
    f.nom ASC NULLS LAST
  LIMIT LEAST(p_limit, 200) OFFSET GREATEST(0, p_offset);
END;
$$;

COMMENT ON FUNCTION public.brh_dirigeants_search(text, text, boolean, boolean, boolean, integer, integer, text) IS
  'Recherche dirigeants v3 (fix B6) — ajout p_order_by [patrimoine|nom|sci_count]. Backward compat : sans p_order_by, comportement v2 inchangé.';

GRANT EXECUTE ON FUNCTION public.brh_dirigeants_search(text, text, boolean, boolean, boolean, integer, integer, text) TO authenticated;
