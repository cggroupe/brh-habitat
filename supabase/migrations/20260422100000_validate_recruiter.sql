-- Migration: Fonction de validation recruiter UUID + role attendu
-- Date: 2026-04-22
-- Contexte: L'URL ?recruiter=xxx etait accepte en aveugle dans updateCompanyRecruiter()
--           et updateAffiliateRecruiter(). Probleme : references cassees possibles
--           (recruited_by pointe vers un UUID inexistant ou un user du mauvais role).

CREATE OR REPLACE FUNCTION public.validate_recruiter(p_recruiter_id UUID, p_expected_role TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_recruiter_id
      AND role = p_expected_role
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION public.validate_recruiter IS
  'Verifie que le recruiter existe, est actif et a le role attendu (pro ou particulier). Utilise par updateCompanyRecruiter / updateAffiliateRecruiter pour eviter les refs cassees.';
