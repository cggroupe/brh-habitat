-- 2026-05-20 — DPE : surcharges employé (postes isolation/ventilation/chauffage) + role calculé.
--
-- CONTEXTE :
--   Sur la fiche client BRH (cas Bodard François ↔ SCI La Colline 14 rue Bugeaud) :
--   1. Le DPE détenu par une SCI apparaissait sans contexte sur la fiche du particulier
--      (qui était simple occupant, pas dirigeant). On veut un tag explicite "Occupant".
--   2. Les postes du DPE (isolation murs, plancher, toiture, ventilation, chauffage, ECS)
--      étaient en lecture seule. L'équipe BRH doit pouvoir noter les travaux réalisés
--      sur chaque poste (état initial DPE → état après travaux).
--
-- SOLUTION :
--   - Colonne JSONB employee_overrides sur brh_dpe_prospects (1 entrée par poste)
--   - RPC brh_dpe_employee_update : merge des overrides + audit
--   - Le rôle DPE (proprietaire / dirigeant / occupant) est calculé à la volée dans
--     brh_personne_360 (mise à jour dans une migration suivante).
--
-- FORMAT employee_overrides :
--   {
--     "qualite_isolation_murs": {
--       "status": "realise" | "en_cours" | "a_realiser" | "na",
--       "comment": "ITE polyuréthane 2024",
--       "updated_at": "2026-05-20T14:00:00Z",
--       "updated_by": "<uuid>"
--     },
--     ...
--   }
--
-- POSTES SUPPORTÉS (7) :
--   qualite_isolation_murs, qualite_isolation_menuiseries,
--   qualite_isolation_plancher_bas, qualite_isolation_plancher_haut,
--   isolation_toiture_detail, type_ventilation,
--   energie_chauffage, energie_ecs

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colonnes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dpe_prospects
  ADD COLUMN IF NOT EXISTS employee_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS employee_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS employee_updated_by uuid;

COMMENT ON COLUMN public.brh_dpe_prospects.employee_overrides IS
  'Surcharges employé BRH par poste DPE. Clés : qualite_isolation_murs, _menuiseries, _plancher_bas, _plancher_haut, isolation_toiture_detail, type_ventilation, energie_chauffage, energie_ecs. Chaque valeur : {status, comment, updated_at, updated_by}.';

-- Liste blanche des postes autorisés (verrou côté RPC).
-- Si tu ajoutes un poste, mettre à jour la fonction brh_dpe_employee_update ci-dessous.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC : update overrides
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.brh_dpe_employee_update(
  p_dpe_id integer,
  p_overrides jsonb
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_uid uuid := auth.uid();
  v_allowed_keys text[] := ARRAY[
    'qualite_isolation_murs',
    'qualite_isolation_menuiseries',
    'qualite_isolation_plancher_bas',
    'qualite_isolation_plancher_haut',
    'isolation_toiture_detail',
    'type_ventilation',
    'energie_chauffage',
    'energie_ecs'
  ];
  v_allowed_status text[] := ARRAY['realise', 'en_cours', 'a_realiser', 'na'];
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_entry jsonb;
  v_status text;
  v_comment text;
  v_result jsonb;
BEGIN
  -- Auth : admin OU employe
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid
      AND pr.role = ANY (ARRAY['admin'::text, 'employe'::text])
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: BRH staff only' USING ERRCODE = '42501';
  END IF;

  -- Validation : whitelist clés + status
  FOR v_key, v_entry IN SELECT * FROM jsonb_each(COALESCE(p_overrides, '{}'::jsonb)) LOOP
    IF NOT (v_key = ANY (v_allowed_keys)) THEN
      RAISE EXCEPTION 'Poste DPE non autorisé : %', v_key USING ERRCODE = '22023';
    END IF;
    v_status := v_entry->>'status';
    IF v_status IS NULL OR NOT (v_status = ANY (v_allowed_status)) THEN
      RAISE EXCEPTION 'Status invalide pour % : % (attendu : %)',
        v_key, v_status, v_allowed_status USING ERRCODE = '22023';
    END IF;
    v_comment := v_entry->>'comment';
    -- Reconstruit l'entry avec audit
    v_clean := v_clean || jsonb_build_object(v_key, jsonb_build_object(
      'status', v_status,
      'comment', COALESCE(v_comment, ''),
      'updated_at', now(),
      'updated_by', v_uid
    ));
  END LOOP;

  -- Merge avec l'existant (les postes non envoyés restent inchangés)
  UPDATE public.brh_dpe_prospects
     SET employee_overrides = COALESCE(employee_overrides, '{}'::jsonb) || v_clean,
         employee_updated_at = now(),
         employee_updated_by = v_uid
   WHERE id = p_dpe_id
   RETURNING employee_overrides INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DPE % introuvable', p_dpe_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dpe_employee_update(integer, jsonb) TO authenticated;

COMMENT ON FUNCTION public.brh_dpe_employee_update IS
  '2026-05-20 — Update surcharges employé sur un DPE (7 postes whitelistés). Auth admin/employe.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC helper : retourne le rôle d'une personne vis-à-vis d'un DPE
-- ─────────────────────────────────────────────────────────────────────────────
-- Règle :
--   - 'proprietaire'  : owner_siren NULL (DPE détenu par particulier)
--   - 'dirigeant'     : owner_siren NOT NULL ET personne est dirigeante de cette SCI
--   - 'occupant'      : owner_siren NOT NULL ET personne PAS dirigeante (locataire, etc.)
--   - NULL            : personne sans lien avec le DPE

CREATE OR REPLACE FUNCTION public.brh_dpe_role_for_personne(
  p_dpe_id integer,
  p_personne_id uuid
)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH dpe AS (
    SELECT owner_siren FROM public.brh_dpe_prospects WHERE id = p_dpe_id
  ),
  dirige AS (
    SELECT 1
    FROM public.brh_entity_links l, dpe
    WHERE l.from_type = 'personne_brh'
      AND l.from_id = p_personne_id::text
      AND l.link_type = 'dirige'
      AND dpe.owner_siren IS NOT NULL
      AND l.to_id = dpe.owner_siren::text
    LIMIT 1
  )
  SELECT CASE
    WHEN (SELECT owner_siren FROM dpe) IS NULL THEN 'proprietaire'
    WHEN EXISTS (SELECT 1 FROM dirige) THEN 'dirigeant'
    ELSE 'occupant'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dpe_role_for_personne(integer, uuid) TO authenticated;

COMMENT ON FUNCTION public.brh_dpe_role_for_personne IS
  '2026-05-20 — Rôle d''une personne BRH vis-à-vis d''un DPE : proprietaire / dirigeant / occupant.';
