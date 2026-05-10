-- =============================================================================
-- Phase Employé V2.1 — Foundations DB pour le persona Employé BRH
-- =============================================================================
-- Tables :
--   1. brh_employees           — registre des employés BRH (commerciaux, opérationnels)
--   2. brh_employee_actions    — log des actions qui rapportent des points
--                                 (envoi mail, recrutement signé, post réseaux, RDV tenu)
--
-- Fonctions :
--   3. brh_compute_employee_score(uuid)  — recalcule le score à partir des actions
--   4. brh_compute_employee_level(int)   — dérive le niveau à partir du score
--
-- Trigger :
--   5. brh_employees_action_after_insert — recalcule score + level à chaque INSERT action
--
-- Conformité 14 règles :
--   #5  COMMIT à la fin
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur SECURITY DEFINER
--   #6  RLS strict (pas USING true)
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_employees
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_label TEXT NOT NULL DEFAULT 'Commercial BRH',
  -- Score d'activité (calculé auto via trigger sur brh_employee_actions)
  activity_score INTEGER NOT NULL DEFAULT 0,
  activity_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (activity_level IN ('standard', 'pro', 'expert', 'master')),
  -- Compteur de leads attribués ce mois (reset par cron mensuel — V2.5)
  leads_received_this_month INTEGER NOT NULL DEFAULT 0,
  -- Signature email personnalisée (HTML simple)
  signature_html TEXT,
  -- Bool actif (on désactive un employé qui quitte BRH plutôt que le supprimer)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_employees_active_score
  ON brh_employees(is_active, activity_score DESC) WHERE is_active = true;

COMMENT ON TABLE brh_employees IS
  'Phase Employé V2.1 — Registre des employés BRH (commerciaux, opérationnels).
  Remplace le registre statique src/lib/brh-employees.ts. activity_score calculé
  auto via trigger sur brh_employee_actions.';

-- ----------------------------------------------------------------------------
-- 2. brh_employee_actions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_employee_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES brh_employees(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'email_sent',           -- mail recrutement envoyé (+5 pts)
      'partner_recruited',    -- partenaire signé (+50 pts)
      'social_post',          -- publication réseaux sociaux (+10 pts)
      'rdv_completed',        -- RDV particulier tenu avec compte-rendu (+10 pts)
      'lead_converted',       -- lead transformé en chantier signé (+25 pts)
      'manual_admin'          -- ajustement manuel admin (any value)
    )),
  points INTEGER NOT NULL,
  -- Référence optionnelle vers l'entité liée (mail_id, partner_id, post_id…)
  related_entity_type TEXT,
  related_entity_id UUID,
  -- Notes admin (ex: motif d'un ajustement manual_admin)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Pour métadonnées extra (traçabilité campagne, etc.)
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS brh_employee_actions_employee_recent
  ON brh_employee_actions(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_employee_actions_type_recent
  ON brh_employee_actions(action_type, created_at DESC);

COMMENT ON TABLE brh_employee_actions IS
  'Phase Employé V2.1 — Log des actions qui rapportent des points (gamification).
  Chaque INSERT déclenche le recalcul de brh_employees.activity_score + activity_level.';

-- ----------------------------------------------------------------------------
-- 3. Fonction : recalcul score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_compute_employee_score(p_employee_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_score INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0)
  INTO v_score
  FROM public.brh_employee_actions
  WHERE employee_id = p_employee_id;
  RETURN v_score;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Fonction : niveau dérivé
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_compute_employee_level(p_score INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_score >= 350 THEN 'master'
    WHEN p_score >= 150 THEN 'expert'
    WHEN p_score >= 50  THEN 'pro'
    ELSE 'standard'
  END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Trigger : sync auto à chaque action
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_employees_sync_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_score INTEGER;
BEGIN
  v_score := public.brh_compute_employee_score(NEW.employee_id);
  UPDATE public.brh_employees
  SET activity_score = v_score,
      activity_level = public.brh_compute_employee_level(v_score),
      updated_at = now()
  WHERE id = NEW.employee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_employees_action_after_insert ON brh_employee_actions;
CREATE TRIGGER brh_employees_action_after_insert
  AFTER INSERT ON brh_employee_actions
  FOR EACH ROW
  EXECUTE FUNCTION brh_employees_sync_score();

-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_employee_actions ENABLE ROW LEVEL SECURITY;

-- Employé voit son propre profil
CREATE POLICY "Employé voit son propre profil" ON brh_employees
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Employé peut update sa signature
CREATE POLICY "Employé update sa signature" ON brh_employees
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admin manage all
CREATE POLICY "Admin manage employees" ON brh_employees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Actions : employé voit les siennes
CREATE POLICY "Employé voit ses actions" ON brh_employee_actions
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

-- Actions : admin manage all
CREATE POLICY "Admin manage actions" ON brh_employee_actions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7. Seed Pierre Collard (depuis le registre statique JS)
-- ----------------------------------------------------------------------------
INSERT INTO brh_employees (profile_id, full_name, email, role_label, activity_score)
SELECT id, 'Pierre Collard', email, 'Commercial BRH', 42
FROM profiles WHERE email = 'pierre.collard@brh-demo.fr'
ON CONFLICT (profile_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role_label = EXCLUDED.role_label;

-- Seed actions historiques pour Pierre (42 pts répartis = 5×email_sent + 1×partner_recruited dérisoire,
-- on simplifie en 1 manual_admin de +42 pour reproduire le score)
INSERT INTO brh_employee_actions (employee_id, action_type, points, notes)
SELECT id, 'manual_admin', 42, 'Score initial de seed (registre statique V1)'
FROM brh_employees WHERE email = 'pierre.collard@brh-demo.fr'
  AND NOT EXISTS (
    SELECT 1 FROM brh_employee_actions
    WHERE employee_id = brh_employees.id AND action_type = 'manual_admin' AND notes LIKE 'Score initial%'
  );

COMMIT;
