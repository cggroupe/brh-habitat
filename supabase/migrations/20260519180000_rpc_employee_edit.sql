-- 2026-05-19 — RPCs d'édition employé pour brh_personnes_historique et brh_dpe_prospects.
--
-- Whitelist stricte des champs éditables.
-- Audit log automatique de chaque modification.
-- SECURITY DEFINER + check rôle BRH interne.

CREATE OR REPLACE FUNCTION public.brh_personne_update_employee(
  p_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_old record;
  v_changes int := 0;
  v_field text;
  v_old_val text;
  v_new_val text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.brh_personnes_historique WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = 'P0002';
  END IF;

  -- Whitelist stricte. Pour chaque clé jsonb présente, on log + on update.
  FOR v_field IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_field NOT IN (
      'telephone','email','adresse','code_postal','ville',
      'employee_notes','travaux_terrain_status','dpe_terrain_estime',
      'interet_brh','contact_disponibilite','derniere_visite_terrain'
    ) THEN
      CONTINUE;
    END IF;
    v_new_val := NULLIF(p_patch->>v_field, '');
    EXECUTE format('SELECT $1.%I::text', v_field) USING v_old INTO v_old_val;
    IF COALESCE(v_old_val, '') IS DISTINCT FROM COALESCE(v_new_val, '') THEN
      INSERT INTO public.brh_employee_edit_log
        (entity_type, entity_id, employee_id, field_changed, old_value, new_value)
      VALUES ('personne_brh', p_id::text, v_uid, v_field, v_old_val, v_new_val);
      v_changes := v_changes + 1;
    END IF;
  END LOOP;

  UPDATE public.brh_personnes_historique
  SET
    telephone = COALESCE(NULLIF(p_patch->>'telephone',''), telephone),
    email = COALESCE(NULLIF(p_patch->>'email',''), email),
    adresse = COALESCE(NULLIF(p_patch->>'adresse',''), adresse),
    code_postal = COALESCE(NULLIF(p_patch->>'code_postal',''), code_postal),
    ville = COALESCE(NULLIF(p_patch->>'ville',''), ville),
    employee_notes = CASE WHEN p_patch ? 'employee_notes'
      THEN NULLIF(p_patch->>'employee_notes','') ELSE employee_notes END,
    travaux_terrain_status = CASE WHEN p_patch ? 'travaux_terrain_status'
      THEN NULLIF(p_patch->>'travaux_terrain_status','') ELSE travaux_terrain_status END,
    dpe_terrain_estime = CASE WHEN p_patch ? 'dpe_terrain_estime'
      THEN NULLIF(p_patch->>'dpe_terrain_estime','') ELSE dpe_terrain_estime END,
    interet_brh = CASE WHEN p_patch ? 'interet_brh'
      THEN NULLIF(p_patch->>'interet_brh','') ELSE interet_brh END,
    contact_disponibilite = CASE WHEN p_patch ? 'contact_disponibilite'
      THEN NULLIF(p_patch->>'contact_disponibilite','') ELSE contact_disponibilite END,
    derniere_visite_terrain = CASE WHEN p_patch ? 'derniere_visite_terrain'
      THEN NULLIF(p_patch->>'derniere_visite_terrain','')::date ELSE derniere_visite_terrain END,
    employee_updated_at = now(),
    employee_updated_by = v_uid,
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'changes', v_changes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_update_employee(uuid, jsonb) TO authenticated;

-- ============================================================
-- Variante pour brh_dpe_prospects (adresse DPE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.brh_dpe_update_employee(
  p_dpe_id integer,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_old record;
  v_changes int := 0;
  v_field text;
  v_old_val text;
  v_new_val text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.brh_dpe_prospects WHERE id = p_dpe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DPE not found' USING ERRCODE = 'P0002';
  END IF;

  FOR v_field IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_field NOT IN (
      'employee_notes','travaux_terrain_status','dpe_terrain_estime',
      'interet_brh','contact_disponibilite','derniere_visite_terrain'
    ) THEN
      CONTINUE;
    END IF;
    v_new_val := NULLIF(p_patch->>v_field, '');
    EXECUTE format('SELECT $1.%I::text', v_field) USING v_old INTO v_old_val;
    IF COALESCE(v_old_val, '') IS DISTINCT FROM COALESCE(v_new_val, '') THEN
      INSERT INTO public.brh_employee_edit_log
        (entity_type, entity_id, employee_id, field_changed, old_value, new_value)
      VALUES ('adresse_dpe', p_dpe_id::text, v_uid, v_field, v_old_val, v_new_val);
      v_changes := v_changes + 1;
    END IF;
  END LOOP;

  UPDATE public.brh_dpe_prospects
  SET
    employee_notes = CASE WHEN p_patch ? 'employee_notes'
      THEN NULLIF(p_patch->>'employee_notes','') ELSE employee_notes END,
    travaux_terrain_status = CASE WHEN p_patch ? 'travaux_terrain_status'
      THEN NULLIF(p_patch->>'travaux_terrain_status','') ELSE travaux_terrain_status END,
    dpe_terrain_estime = CASE WHEN p_patch ? 'dpe_terrain_estime'
      THEN NULLIF(p_patch->>'dpe_terrain_estime','') ELSE dpe_terrain_estime END,
    interet_brh = CASE WHEN p_patch ? 'interet_brh'
      THEN NULLIF(p_patch->>'interet_brh','') ELSE interet_brh END,
    contact_disponibilite = CASE WHEN p_patch ? 'contact_disponibilite'
      THEN NULLIF(p_patch->>'contact_disponibilite','') ELSE contact_disponibilite END,
    derniere_visite_terrain = CASE WHEN p_patch ? 'derniere_visite_terrain'
      THEN NULLIF(p_patch->>'derniere_visite_terrain','')::date ELSE derniere_visite_terrain END,
    employee_updated_at = now(),
    employee_updated_by = v_uid,
    updated_at = now()
  WHERE id = p_dpe_id;

  RETURN jsonb_build_object('ok', true, 'changes', v_changes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dpe_update_employee(integer, jsonb) TO authenticated;
