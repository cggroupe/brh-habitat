-- =============================================================================
-- 2026-05-27 — brh_ext_dgfip_centres : annuaire SIP/SIE/CDIF géolocalisé
-- =============================================================================
--
-- Table d'annuaire des centres des impôts géolocalisés, alimentée par
-- l'API service-public.fr lannuaire-administration.
--
-- Source : https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records
-- Seed : scripts/brh-seed-dgfip-centres.py (Bretagne par défaut)
--
-- Utilisé par : src/components/leads/fiche/DgfipPivot.tsx
--   → Affiche les 3 centres DGFIP les plus proches d'une adresse quand le
--     propriétaire est inconnu (personne physique non divulguable RGPD).
--     Pattern Data-B "trou de donnée = parcours vers Cerfa 3233-SD".
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brh_ext_dgfip_centres (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  type_centre TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  commune TEXT,
  departement TEXT,
  telephone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT brh_ext_dgfip_centres_type_chk
    CHECK (type_centre IN ('SIP', 'SIE', 'CDIF', 'AUTRE'))
);

CREATE INDEX IF NOT EXISTS idx_brh_dgfip_dept ON public.brh_ext_dgfip_centres (departement);
CREATE INDEX IF NOT EXISTS idx_brh_dgfip_coords ON public.brh_ext_dgfip_centres (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RPC : 3 centres DGFIP les plus proches d'un point lat/lng (Haversine)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_dgfip_nearest(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id TEXT,
  nom TEXT,
  type_centre TEXT,
  adresse TEXT,
  code_postal TEXT,
  commune TEXT,
  telephone TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    c.id,
    c.nom,
    c.type_centre,
    c.adresse,
    c.code_postal,
    c.commune,
    c.telephone,
    (6371 * acos(
      cos(radians(p_lat)) * cos(radians(c.lat))
      * cos(radians(c.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(c.lat))
    )) AS distance_km
  FROM public.brh_ext_dgfip_centres c
  WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dgfip_nearest(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
  TO authenticated, anon;

COMMENT ON TABLE public.brh_ext_dgfip_centres IS
  'Annuaire SIP/SIE/CDIF géolocalisé. Source : api-lannuaire.service-public.fr. Seed via scripts/brh-seed-dgfip-centres.py.';

COMMENT ON FUNCTION public.brh_dgfip_nearest IS
  'Retourne les N centres DGFIP les plus proches dun point lat/lng par formule Haversine. Utilisé pour le pivot RGPD propriétaire physique inconnu.';
