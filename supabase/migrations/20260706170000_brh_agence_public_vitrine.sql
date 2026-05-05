-- =============================================================================
-- Phase 16.1 — Vitrine publique agence + QR code personnalisé
-- =============================================================================
--
-- Une agence partenaire peut générer un QR code menant à une fiche publique
-- (page `/a/:agenceId`) où les prospects peuvent demander une simulation
-- gratuite. La fiche affiche uniquement raison_sociale + commune + dept,
-- jamais le SIRET ni les contacts internes.
--
-- Accès public via RPC SECURITY DEFINER (RLS reste verrouillé).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. RPC : retourne les infos publiques minimales d'une agence partenaire
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_get_public_agence(p_agence_id UUID)
RETURNS TABLE (
  id UUID,
  raison_sociale TEXT,
  commune TEXT,
  departement CHAR(2),
  code_postal CHAR(5),
  site_web TEXT,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id,
    a.raison_sociale,
    a.commune,
    a.departement,
    a.code_postal,
    a.site_web,
    a.status
  FROM public.brh_agences_immo a
  WHERE a.id = p_agence_id
    AND a.status = 'partenaire'
    AND EXISTS (
      SELECT 1 FROM public.brh_partner_contracts pc
      WHERE pc.agence_id = a.id
        AND pc.partner_type = 'agence_immo'
        AND pc.status = 'active'
    );
$$;

GRANT EXECUTE ON FUNCTION public.brh_get_public_agence(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.brh_get_public_agence(UUID) IS
  'Phase 16.1 — vitrine publique d''une agence (raison sociale, commune, dept). '
  'Aucune donnée sensible. Filtre status=partenaire + charte active.';

COMMIT;

-- Sanity
SELECT 'rpc_brh_get_public_agence' AS check_name,
       proname,
       pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'brh_get_public_agence';
