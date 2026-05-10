-- =============================================================================
-- Phase Employé V2.3 — Calendrier RDV employé exposé au public
-- =============================================================================
-- L'employé déclare ses créneaux récurrents dispos (lundi 9h-12h, mardi 14h-17h…).
-- Lors de la prise de RDV particulier (ContactRdvModal), on présente les 3 employés
-- les plus actifs (score décroissant) qui ont au moins 1 créneau dispo le jour
-- choisi. Le particulier peut alors sélectionner avec qui il veut prendre RDV.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_employee_calendar — créneaux récurrents hebdomadaires dispo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_employee_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES brh_employees(id) ON DELETE CASCADE,
  -- 0 = dimanche … 6 = samedi (compatible JS Date.getDay())
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- Période sur la journée
  period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon')),
  -- 'available' / 'unavailable' (V2 : 'busy' = pris par RDV)
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, day_of_week, period)
);

CREATE INDEX IF NOT EXISTS brh_employee_calendar_lookup
  ON brh_employee_calendar(day_of_week, period, status) WHERE status = 'available';

COMMENT ON TABLE brh_employee_calendar IS
  'Phase Employé V2.3 — Créneaux récurrents hebdomadaires dispo des employés.
  Utilisé par ContactRdvModal pour afficher quels employés peuvent prendre le
  RDV au créneau choisi (mise en avant selon activity_score décroissant).';

-- ----------------------------------------------------------------------------
-- 2. Ajout colonne assigned_employee_id sur brh_appointments
-- ----------------------------------------------------------------------------
ALTER TABLE brh_appointments
  ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES brh_employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS brh_appointments_employee_recent
  ON brh_appointments(assigned_employee_id, requested_date DESC) WHERE assigned_employee_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Fonction publique : employés dispo pour un créneau donné
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_available_employees_for_slot(
  p_day_of_week SMALLINT,
  p_period TEXT,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  employee_id UUID,
  full_name TEXT,
  role_label TEXT,
  activity_score INTEGER,
  activity_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.full_name,
    e.role_label,
    e.activity_score,
    e.activity_level
  FROM public.brh_employees e
  INNER JOIN public.brh_employee_calendar c ON c.employee_id = e.id
  WHERE e.is_active = true
    AND c.day_of_week = p_day_of_week
    AND c.period = p_period
    AND c.status = 'available'
  ORDER BY e.activity_score DESC, e.full_name ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION brh_available_employees_for_slot TO anon, authenticated;

COMMENT ON FUNCTION brh_available_employees_for_slot IS
  'Phase Employé V2.3 — Retourne les N employés dispo pour un créneau donné,
  triés par activity_score décroissant (mise en avant des plus actifs).
  Public (anon + authenticated) car appelée depuis ContactRdvModal.';

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_employee_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employé manage son calendrier" ON brh_employee_calendar
  FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

CREATE POLICY "Admin manage calendrier" ON brh_employee_calendar
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 5. Seed : Pierre Collard dispo lundi-vendredi matin + après-midi
-- ----------------------------------------------------------------------------
INSERT INTO brh_employee_calendar (employee_id, day_of_week, period)
SELECT id, dow, period
FROM brh_employees,
     unnest(ARRAY[1, 2, 3, 4, 5]) AS dow,  -- lundi (1) à vendredi (5)
     unnest(ARRAY['morning', 'afternoon']) AS period
WHERE email = 'pierre.collard@brh-demo.fr'
ON CONFLICT (employee_id, day_of_week, period) DO NOTHING;

COMMIT;
