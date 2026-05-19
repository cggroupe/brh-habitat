-- 2026-05-19 — Colonnes OSINT entreprise sur brh_sci_companies.
--
-- Permet d'enrichir progressivement les fiches SCI/entreprises avec :
-- site web, email contact, téléphone pro, LinkedIn entreprise, sirene API status
--
-- Source d'enrichissement : Sirene API, Pappers, manuel terrain.

ALTER TABLE public.brh_sci_companies
  ADD COLUMN IF NOT EXISTS osint_website text,
  ADD COLUMN IF NOT EXISTS osint_email text,
  ADD COLUMN IF NOT EXISTS osint_phone_pro text,
  ADD COLUMN IF NOT EXISTS osint_linkedin text,
  ADD COLUMN IF NOT EXISTS osint_other jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS osint_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS osint_updated_by uuid REFERENCES public.profiles(id),
  -- Édition employé terrain (cohérent avec brh_personnes_historique)
  ADD COLUMN IF NOT EXISTS employee_notes text,
  ADD COLUMN IF NOT EXISTS interet_brh text
    CHECK (interet_brh IN ('chaud','tiede','froid','a_recontacter','refus','inconnu') OR interet_brh IS NULL),
  ADD COLUMN IF NOT EXISTS contact_disponibilite text
    CHECK (contact_disponibilite IN ('matin','apres_midi','soir','weekend','inconnu') OR contact_disponibilite IS NULL),
  ADD COLUMN IF NOT EXISTS derniere_visite_terrain date,
  ADD COLUMN IF NOT EXISTS employee_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS employee_updated_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS brh_sci_interet_idx
  ON public.brh_sci_companies (interet_brh) WHERE interet_brh IS NOT NULL;

COMMENT ON COLUMN public.brh_sci_companies.osint_website IS
  '2026-05-19 — Site web entreprise (auto via Sirene API ou saisie terrain).';
COMMENT ON COLUMN public.brh_sci_companies.osint_email IS
  '2026-05-19 — Email contact entreprise.';
COMMENT ON COLUMN public.brh_sci_companies.osint_linkedin IS
  '2026-05-19 — LinkedIn entreprise (URL).';

-- Table audit log spécifique SCI/entreprise (analogue à personnes)
-- Réutilise brh_employee_edit_log avec entity_type='sci'
ALTER TABLE public.brh_employee_edit_log
  DROP CONSTRAINT IF EXISTS brh_employee_edit_log_entity_type_check;

ALTER TABLE public.brh_employee_edit_log
  ADD CONSTRAINT brh_employee_edit_log_entity_type_check
  CHECK (entity_type IN ('personne_brh', 'adresse_dpe', 'sci', 'permis'));

-- RPC d'update employé pour SCI (whitelist stricte)
CREATE OR REPLACE FUNCTION public.brh_sci_update_employee(
  p_siren text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_field text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.brh_sci_companies WHERE siren = p_siren) THEN
    RAISE EXCEPTION 'SCI not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.brh_sci_companies
  SET
    osint_website = CASE WHEN p_patch ? 'osint_website'
      THEN NULLIF(p_patch->>'osint_website','') ELSE osint_website END,
    osint_email = CASE WHEN p_patch ? 'osint_email'
      THEN NULLIF(p_patch->>'osint_email','') ELSE osint_email END,
    osint_phone_pro = CASE WHEN p_patch ? 'osint_phone_pro'
      THEN NULLIF(p_patch->>'osint_phone_pro','') ELSE osint_phone_pro END,
    osint_linkedin = CASE WHEN p_patch ? 'osint_linkedin'
      THEN NULLIF(p_patch->>'osint_linkedin','') ELSE osint_linkedin END,
    employee_notes = CASE WHEN p_patch ? 'employee_notes'
      THEN NULLIF(p_patch->>'employee_notes','') ELSE employee_notes END,
    interet_brh = CASE WHEN p_patch ? 'interet_brh'
      THEN NULLIF(p_patch->>'interet_brh','') ELSE interet_brh END,
    contact_disponibilite = CASE WHEN p_patch ? 'contact_disponibilite'
      THEN NULLIF(p_patch->>'contact_disponibilite','') ELSE contact_disponibilite END,
    derniere_visite_terrain = CASE WHEN p_patch ? 'derniere_visite_terrain'
      THEN NULLIF(p_patch->>'derniere_visite_terrain','')::date ELSE derniere_visite_terrain END,
    osint_updated_at = CASE WHEN p_patch ? 'osint_website' OR p_patch ? 'osint_email'
                              OR p_patch ? 'osint_linkedin' OR p_patch ? 'osint_phone_pro'
                          THEN now() ELSE osint_updated_at END,
    osint_updated_by = CASE WHEN p_patch ? 'osint_website' OR p_patch ? 'osint_email'
                              OR p_patch ? 'osint_linkedin' OR p_patch ? 'osint_phone_pro'
                          THEN v_uid ELSE osint_updated_by END,
    employee_updated_at = now(),
    employee_updated_by = v_uid,
    updated_at = now()
  WHERE siren = p_siren;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_sci_update_employee(text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.brh_sci_update_employee IS
  '2026-05-19 — Update employé sur fiche SCI : OSINT entreprise (website/email/phone/LinkedIn) + suivi commercial terrain.';
