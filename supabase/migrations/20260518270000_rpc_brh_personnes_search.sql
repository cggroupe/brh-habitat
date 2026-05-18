-- 2026-05-18 — RPC pour la page /employe/clients-brh (Sprint 16).
-- Recherche + filtres sur brh_personnes_historique (16 607 contacts).

CREATE OR REPLACE FUNCTION public.brh_personnes_search(
  p_query text DEFAULT NULL,
  p_statut text DEFAULT NULL,  -- 'Client' | 'Prospect' | NULL = tous
  p_dept text DEFAULT NULL,
  p_with_tel boolean DEFAULT FALSE,
  p_with_email boolean DEFAULT FALSE,
  p_with_ca boolean DEFAULT FALSE,
  p_with_rdv boolean DEFAULT FALSE,
  p_with_dpe_link boolean DEFAULT FALSE,
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
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
BEGIN
  -- Accès réservé aux BRH internes (admin/pro/employe). Pas aux agences.
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
    cnt.n
  FROM filtered f, cnt
  ORDER BY
    f.ca_total_eur DESC NULLS LAST,
    f.nb_rdv DESC,
    f.derniere_facture DESC NULLS LAST,
    f.full_name
  LIMIT LEAST(p_limit, 200)
  OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personnes_search(
  text, text, text, boolean, boolean, boolean, boolean, boolean, int, int
) TO authenticated;

COMMENT ON FUNCTION public.brh_personnes_search IS
  '2026-05-18 — Search clients BRH historiques (16 607 contacts), réservé BRH internes.';
