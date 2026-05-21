-- 2026-05-21 — Feature Philippe — Création prospect depuis DPE anonyme
--
-- DEMANDE :
--   « Pour les DPE où les personnes n'ont pas de nom, nos employés peuvent
--   enregistrer une personne / un prospect avec nom prénom voilà tout
--   simplement »
--
-- USAGE : Sur la fiche DPE adresse `/employe/leads/adresse/[dpeId]` si
--   `owner_name IS NULL`, un bouton "Créer prospect" ouvre un form
--   (nom, prénom, tel?, email?) → appelle ce RPC.
--
-- COMPORTEMENT :
--   - Vérifie qu'il n'existe PAS déjà un prospect avec même nom+prénom à
--     l'adresse du DPE (anti-doublon)
--   - INSERT dans brh_personnes_historique :
--     • nom, prénom, telephone?, email?
--     • adresse + code_postal + ville copiés du DPE
--     • linked_dpe_id = DPE source
--     • source_primaire = 'employe_create_from_dpe'
--     • statut = 'prospect'
--     • fingerprint_hash = MD5(nom_norm || prenom_norm || cp || voie_norm)
--   - Retourne l'UUID du nouveau prospect

CREATE OR REPLACE FUNCTION public.brh_create_prospect_from_dpe(
  p_dpe_id integer,
  p_nom text,
  p_prenom text,
  p_telephone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_dpe RECORD;
  v_existing_id uuid;
  v_new_id uuid;
  v_nom_clean text;
  v_prenom_clean text;
  v_fp text;
BEGIN
  -- 1. Access guard : employé/admin/pro uniquement
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validation input
  v_nom_clean := trim(coalesce(p_nom, ''));
  v_prenom_clean := trim(coalesce(p_prenom, ''));
  IF v_nom_clean = '' OR v_prenom_clean = '' THEN
    RAISE EXCEPTION 'Nom et prénom obligatoires'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Récupérer le DPE source
  SELECT id, adresse, code_postal, commune, voie_norm, numero_norm
    INTO v_dpe
    FROM public.brh_dpe_prospects
   WHERE id = p_dpe_id;

  IF v_dpe.id IS NULL THEN
    RAISE EXCEPTION 'DPE introuvable (id=%)', p_dpe_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Anti-doublon : prospect déjà existant pour ce nom+prénom à cette adresse ?
  SELECT id INTO v_existing_id
    FROM public.brh_personnes_historique p
   WHERE p.code_postal = v_dpe.code_postal
     AND p.voie_norm = v_dpe.voie_norm
     AND lower(public.f_unaccent(p.nom)) = lower(public.f_unaccent(v_nom_clean))
     AND lower(public.f_unaccent(p.prenom)) = lower(public.f_unaccent(v_prenom_clean))
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Existe déjà : on lie juste le DPE si pas déjà lié
    UPDATE public.brh_personnes_historique
       SET linked_dpe_id = p_dpe_id,
           updated_at = now()
     WHERE id = v_existing_id
       AND (linked_dpe_id IS NULL OR linked_dpe_id <> p_dpe_id);
    RETURN v_existing_id;
  END IF;

  -- 5. INSERT nouveau prospect
  v_fp := md5(
    lower(public.f_unaccent(v_nom_clean)) || '|' ||
    lower(public.f_unaccent(v_prenom_clean)) || '|' ||
    coalesce(v_dpe.code_postal, '') || '|' ||
    coalesce(v_dpe.voie_norm, '')
  );

  INSERT INTO public.brh_personnes_historique (
    fingerprint_hash, nom, prenom, telephone, email,
    adresse, code_postal, ville,
    statut, source_primaire, linked_dpe_id
  ) VALUES (
    v_fp,
    v_nom_clean,
    v_prenom_clean,
    nullif(trim(coalesce(p_telephone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    v_dpe.adresse,
    v_dpe.code_postal,
    v_dpe.commune,
    'prospect',
    'employe_create_from_dpe',
    p_dpe_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.brh_create_prospect_from_dpe(integer, text, text, text, text) IS
  'Crée un prospect dans brh_personnes_historique depuis un DPE anonyme (sans owner_name). Anti-doublon par (cp+voie+nom+prenom). linked_dpe_id rempli. Employé BRH only.';

GRANT EXECUTE ON FUNCTION public.brh_create_prospect_from_dpe(integer, text, text, text, text)
  TO authenticated;
