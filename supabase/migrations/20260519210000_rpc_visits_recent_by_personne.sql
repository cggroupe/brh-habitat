-- 2026-05-19 — RPC qui retourne les visites récentes par personne (bulk).
-- Permet d'afficher la colonne "Vu par X" dans la liste leads sans N+1.

CREATE OR REPLACE FUNCTION public.brh_visits_recent_bulk(
  p_personne_ids uuid[]
)
RETURNS TABLE (
  personne_id uuid,
  employee_id uuid,
  employee_name text,
  seen_at timestamptz,
  visit_count_total integer
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
  WITH ranked AS (
    SELECT
      v.personne_id,
      v.employee_id,
      COALESCE(pr.full_name, pr.email, 'Employé') AS employee_name,
      v.seen_at,
      ROW_NUMBER() OVER (PARTITION BY v.personne_id ORDER BY v.seen_at DESC) AS rn
    FROM public.brh_personne_visits v
    LEFT JOIN public.profiles pr ON pr.id = v.employee_id
    WHERE v.personne_id = ANY(p_personne_ids)
  ),
  counts AS (
    SELECT personne_id, COUNT(*)::int AS total
    FROM public.brh_personne_visits
    WHERE personne_id = ANY(p_personne_ids)
    GROUP BY personne_id
  )
  SELECT r.personne_id, r.employee_id, r.employee_name, r.seen_at, c.total
  FROM ranked r
  JOIN counts c ON c.personne_id = r.personne_id
  WHERE r.rn <= 3
  ORDER BY r.personne_id, r.seen_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_visits_recent_bulk(uuid[]) TO authenticated;
