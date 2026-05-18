-- 2026-05-18 — RPC `brh_sci_search_dirigeant` pour recherche par nom de dirigeant.
--
-- Bug front : `supabase.from('brh_sci_companies').ilike('dirigeants::text', '%X%')`
-- ne marche pas — PostgREST ne reconnaît pas `::text` comme cast, et tente
-- ILIKE sur la colonne jsonb directement → ERROR: operator does not exist: jsonb ~~* unknown.
--
-- Fix : RPC SQL SECURITY DEFINER qui fait le cast côté serveur.
-- Optionnel : ajouter un index GIN trigram sur (dirigeants::text) si la requête
-- devient lente (vérifier après ~10k appels).

CREATE OR REPLACE FUNCTION brh_sci_search_dirigeant(
  p_name text,
  p_limit int DEFAULT 15
)
RETURNS TABLE (
  siren char(9),
  denomination text,
  dirigeants jsonb,
  is_active boolean,
  has_deceased_dirigeant boolean,
  commune text,
  code_postal char(5)
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.siren, s.denomination, s.dirigeants, s.is_active, s.has_deceased_dirigeant,
         s.commune, s.code_postal
  FROM public.brh_sci_companies s
  WHERE p_name IS NOT NULL
    AND length(p_name) >= 2
    AND s.dirigeants::text ILIKE '%' || p_name || '%'
  ORDER BY s.is_active DESC, s.denomination
  LIMIT LEAST(p_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION brh_sci_search_dirigeant(text, int) TO authenticated;

COMMENT ON FUNCTION brh_sci_search_dirigeant(text, int)
  IS '2026-05-18 — Recherche fuzzy d''une personne dans brh_sci_companies.dirigeants JSONB. Utilisé par /agence/recherche et FichePersonneView.';
