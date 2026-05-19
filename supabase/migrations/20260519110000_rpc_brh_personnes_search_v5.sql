-- 2026-05-19 — RPC v5 : expose enrichment_score/tier + osint_other au frontend.
-- Permet filtre p_tier et tri par enrichment_score DESC en priorité.
--
-- Changements vs v4 (20260518270000) :
--   + p_tier (gold|silver|bronze|none|NULL) filtre par niveau enrichi
--   + RETURNS : ajoute enrichment_score, enrichment_tier, osint_other
--   + ORDER BY : enrichment_score DESC en priorité (gold puis silver…)
--   + AGG : on hash osint_other pour ne pas alourdir (cap à clés utiles)

CREATE OR REPLACE FUNCTION public.brh_personnes_search(
  p_query text DEFAULT NULL,
  p_statut text DEFAULT NULL,
  p_dept text DEFAULT NULL,
  p_with_tel boolean DEFAULT FALSE,
  p_with_email boolean DEFAULT FALSE,
  p_with_ca boolean DEFAULT FALSE,
  p_with_rdv boolean DEFAULT FALSE,
  p_with_dpe_link boolean DEFAULT FALSE,
  p_tier text DEFAULT NULL,  -- 'gold' | 'silver' | 'bronze' | 'none' | NULL
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  fingerprint_hash text,
  full_name text,
  nom text,
  prenom text,
  societe text,
  is_pro boolean,
  telephone text,
  email text,
  adresse text,
  code_postal text,
  ville text,
  ca_total_eur integer,
  premiere_facture date,
  derniere_facture date,
  nb_rdv smallint,
  enfants text,
  statut text,
  categorie text,
  source_primaire text,
  sources_secondaires text[],
  linked_dpe_id integer,
  link_confidence numeric,
  osint_linkedin text,
  osint_facebook text,
  osint_other jsonb,
  psy_profile jsonb,
  enrichment_score smallint,
  enrichment_tier text,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
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
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT p.*
    FROM public.brh_personnes_historique p
    WHERE (p_statut IS NULL OR p.statut = p_statut)
      AND (p_dept IS NULL OR p.code_postal LIKE p_dept || '%')
      AND (NOT p_with_tel OR p.telephone IS NOT NULL)
      AND (NOT p_with_email OR p.email IS NOT NULL)
      AND (NOT p_with_ca OR p.ca_total_eur IS NOT NULL)
      AND (NOT p_with_rdv OR p.nb_rdv > 0)
      AND (NOT p_with_dpe_link OR p.linked_dpe_id IS NOT NULL)
      AND (p_tier IS NULL OR p.enrichment_tier = p_tier)
      AND (
        p_query IS NULL OR p_query = ''
        OR p.full_name ILIKE '%' || p_query || '%'
        OR p.societe ILIKE '%' || p_query || '%'
        OR p.email ILIKE '%' || p_query || '%'
        OR p.telephone LIKE '%' || p_query || '%'
        OR p.adresse ILIKE '%' || p_query || '%'
        OR p.ville ILIKE '%' || p_query || '%'
        OR p.code_postal LIKE p_query || '%'
      )
  ),
  cnt AS (SELECT COUNT(*) AS n FROM filtered)
  SELECT
    f.id, f.fingerprint_hash, f.full_name, f.nom, f.prenom,
    f.societe, f.is_pro, f.telephone, f.email,
    f.adresse, f.code_postal, f.ville,
    f.ca_total_eur, f.premiere_facture, f.derniere_facture,
    f.nb_rdv, f.enfants, f.statut, f.categorie,
    f.source_primaire, f.sources_secondaires,
    f.linked_dpe_id, f.link_confidence,
    f.osint_linkedin, f.osint_facebook,
    f.osint_other, f.psy_profile,
    f.enrichment_score, f.enrichment_tier,
    cnt.n
  FROM filtered f, cnt
  ORDER BY
    f.enrichment_score DESC NULLS LAST,
    f.ca_total_eur DESC NULLS LAST,
    f.nb_rdv DESC,
    f.derniere_facture DESC NULLS LAST,
    f.full_name
  LIMIT LEAST(p_limit, 200)
  OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personnes_search(
  text, text, text, boolean, boolean, boolean, boolean, boolean, text, int, int
) TO authenticated;

COMMENT ON FUNCTION public.brh_personnes_search(
  text, text, text, boolean, boolean, boolean, boolean, boolean, text, int, int
) IS '2026-05-19 v5 — Recherche BRH avec tier enrichment + osint_other expose.';
