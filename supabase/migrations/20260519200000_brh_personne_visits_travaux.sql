-- 2026-05-19 — Tables visites employés + travaux réalisés par poste.
--
-- Inspiré de la maquette Stitch v3 "Fiche Client Expert" (projet
-- BRHCRM Direction Commerciale 12759214816897017502, screen 5ac730af).
-- But métier :
--  - Tracer quel employé BRH a vu un client (évite doublons commerciaux)
--  - Catalogue des travaux réalisés par poste technique avec entreprise
--    réalisatrice et date pour calculer DPE estimé après visite.

-- ============================================================
-- 1. brh_personne_visits — qui a vu qui, quand
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brh_personne_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personne_id uuid NOT NULL REFERENCES public.brh_personnes_historique(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  seen_at timestamptz NOT NULL DEFAULT now(),
  note text,
  visit_type text NOT NULL DEFAULT 'visite_terrain'
    CHECK (visit_type IN ('visite_terrain','appel','email','rdv_planifie','autre'))
);

CREATE INDEX IF NOT EXISTS brh_personne_visits_personne_idx
  ON public.brh_personne_visits (personne_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS brh_personne_visits_employee_idx
  ON public.brh_personne_visits (employee_id, seen_at DESC);

ALTER TABLE public.brh_personne_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brh_personne_visits_select ON public.brh_personne_visits;
CREATE POLICY brh_personne_visits_select ON public.brh_personne_visits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

COMMENT ON TABLE public.brh_personne_visits IS
  '2026-05-19 — Historique des visites/contacts employés BRH sur un client. Permet d''afficher "Déjà visité par X collègue".';

-- ============================================================
-- 2. brh_personne_travaux — catalogue par poste technique
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brh_personne_travaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personne_id uuid NOT NULL REFERENCES public.brh_personnes_historique(id) ON DELETE CASCADE,
  poste_technique text NOT NULL
    CHECK (poste_technique IN (
      'murs','toiture','plancher_bas','fenetres','chauffage',
      'ventilation','eau_chaude','tableau_electrique','autre'
    )),
  etat text NOT NULL DEFAULT 'inconnu'
    CHECK (etat IN ('non_realise','passoire','partiel','realise_recent','realise_ancien','inconnu')),
  description text,
  entreprise_realisatrice text,
  date_travaux date,
  cout_eur integer,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_personne_travaux_personne_idx
  ON public.brh_personne_travaux (personne_id, poste_technique);

ALTER TABLE public.brh_personne_travaux ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brh_personne_travaux_select ON public.brh_personne_travaux;
CREATE POLICY brh_personne_travaux_select ON public.brh_personne_travaux
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

COMMENT ON TABLE public.brh_personne_travaux IS
  '2026-05-19 — Catalogue des travaux réalisés par poste technique sur le logement du contact BRH. Permet aux commerciaux de qualifier précisément l''état actuel et estimer le DPE après travaux complémentaires.';

-- ============================================================
-- 3. RPCs : marquer vu, lister visites, upsert travaux
-- ============================================================

-- Marquer comme vu (insert visit)
CREATE OR REPLACE FUNCTION public.brh_personne_mark_seen(
  p_personne_id uuid,
  p_visit_type text DEFAULT 'visite_terrain',
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.brh_personne_visits
    (personne_id, employee_id, visit_type, note)
  VALUES (p_personne_id, v_uid, p_visit_type, p_note)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'visit_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_mark_seen(uuid, text, text) TO authenticated;

-- Liste des visites d'une personne (avec nom employé)
CREATE OR REPLACE FUNCTION public.brh_personne_visits_list(
  p_personne_id uuid
)
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  employee_name text,
  employee_email text,
  seen_at timestamptz,
  visit_type text,
  note text
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
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT v.id, v.employee_id,
         COALESCE(pr.full_name, pr.email, 'Employé') AS employee_name,
         pr.email,
         v.seen_at, v.visit_type, v.note
  FROM public.brh_personne_visits v
  LEFT JOIN public.profiles pr ON pr.id = v.employee_id
  WHERE v.personne_id = p_personne_id
  ORDER BY v.seen_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_visits_list(uuid) TO authenticated;

-- Upsert travaux par poste (un seul travaux par (personne, poste))
CREATE OR REPLACE FUNCTION public.brh_personne_travaux_upsert(
  p_personne_id uuid,
  p_poste text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Cherche un existant
  SELECT id INTO v_id FROM public.brh_personne_travaux
  WHERE personne_id = p_personne_id AND poste_technique = p_poste
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.brh_personne_travaux
      (personne_id, poste_technique, etat, description, entreprise_realisatrice,
       date_travaux, cout_eur, created_by)
    VALUES (
      p_personne_id, p_poste,
      COALESCE(NULLIF(p_patch->>'etat',''), 'inconnu'),
      NULLIF(p_patch->>'description',''),
      NULLIF(p_patch->>'entreprise_realisatrice',''),
      NULLIF(p_patch->>'date_travaux','')::date,
      NULLIF(p_patch->>'cout_eur','')::integer,
      v_uid
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.brh_personne_travaux
    SET
      etat = COALESCE(NULLIF(p_patch->>'etat',''), etat),
      description = CASE WHEN p_patch ? 'description'
        THEN NULLIF(p_patch->>'description','') ELSE description END,
      entreprise_realisatrice = CASE WHEN p_patch ? 'entreprise_realisatrice'
        THEN NULLIF(p_patch->>'entreprise_realisatrice','') ELSE entreprise_realisatrice END,
      date_travaux = CASE WHEN p_patch ? 'date_travaux'
        THEN NULLIF(p_patch->>'date_travaux','')::date ELSE date_travaux END,
      cout_eur = CASE WHEN p_patch ? 'cout_eur'
        THEN NULLIF(p_patch->>'cout_eur','')::integer ELSE cout_eur END,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'travaux_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_travaux_upsert(uuid, text, jsonb) TO authenticated;

-- Liste des travaux par personne
CREATE OR REPLACE FUNCTION public.brh_personne_travaux_list(
  p_personne_id uuid
)
RETURNS TABLE (
  id uuid,
  poste_technique text,
  etat text,
  description text,
  entreprise_realisatrice text,
  date_travaux date,
  cout_eur integer,
  created_by_name text,
  updated_at timestamptz
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
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT t.id, t.poste_technique, t.etat, t.description,
         t.entreprise_realisatrice, t.date_travaux, t.cout_eur,
         pr.full_name AS created_by_name,
         t.updated_at
  FROM public.brh_personne_travaux t
  LEFT JOIN public.profiles pr ON pr.id = t.created_by
  WHERE t.personne_id = p_personne_id
  ORDER BY
    CASE t.poste_technique
      WHEN 'murs' THEN 1 WHEN 'toiture' THEN 2 WHEN 'plancher_bas' THEN 3
      WHEN 'fenetres' THEN 4 WHEN 'chauffage' THEN 5 WHEN 'ventilation' THEN 6
      WHEN 'eau_chaude' THEN 7 WHEN 'tableau_electrique' THEN 8 ELSE 99
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_travaux_list(uuid) TO authenticated;
