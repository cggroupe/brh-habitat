-- 2026-05-18 — RPC `brh_partner_search` : combobox destinataires depuis la base.

CREATE OR REPLACE FUNCTION public.brh_partner_search(
  p_audience text,
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id text,
  full_name text,
  societe text,
  telephone text,
  email text,
  ville text,
  code_postal text,
  metier text,
  departement text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH artisans AS (
    SELECT
      siret::text AS id,
      NULL::text AS full_name,
      nom_entreprise AS societe,
      telephone,
      email,
      NULL::text AS ville,
      code_postal::text AS code_postal,
      nom_qualification AS metier,
      substr(code_postal::text, 1, 2) AS departement
    FROM public.brh_ext_rge_companies
    WHERE p_audience = 'artisan'
      AND (
        p_query IS NULL OR p_query = ''
        OR nom_entreprise ILIKE '%'||p_query||'%'
        OR code_postal::text LIKE p_query||'%'
      )
  ),
  agences AS (
    SELECT
      siren::text AS id,
      NULL::text AS full_name,
      nom_complet AS societe,
      NULL::text AS telephone,
      NULL::text AS email,
      commune AS ville,
      code_postal::text AS code_postal,
      type_immo AS metier,
      departement::text AS departement
    FROM public.brh_ext_immo_companies
    WHERE p_audience = 'agence_immo'
      AND (
        p_query IS NULL OR p_query = ''
        OR nom_complet ILIKE '%'||p_query||'%'
        OR commune ILIKE '%'||p_query||'%'
        OR code_postal::text LIKE p_query||'%'
      )
  )
  SELECT * FROM (
    SELECT * FROM artisans
    UNION ALL
    SELECT * FROM agences
  ) u
  ORDER BY societe
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.brh_partner_search(text, text, int) TO authenticated;
