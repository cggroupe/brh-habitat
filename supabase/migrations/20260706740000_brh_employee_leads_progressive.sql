-- =============================================================================
-- Phase Employé V2.5 — Leads progressifs (compteur + reset mensuel)
-- =============================================================================
-- L'employé reçoit des leads attribués via brh_appointments.assigned_employee_id.
-- Compteur leads_received_this_month incrémenté auto par trigger sur INSERT.
-- Quota par niveau : standard=5, pro=15, expert=35, master=∞ (999).
-- Reset mensuel à appeler via cron externe (n8n / systemd timer / pg_cron).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Trigger : incrémente le compteur à chaque INSERT brh_appointments avec
--    assigned_employee_id non NULL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_appointments_increment_employee_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.assigned_employee_id IS NOT NULL THEN
    UPDATE public.brh_employees
    SET leads_received_this_month = leads_received_this_month + 1,
        updated_at = now()
    WHERE id = NEW.assigned_employee_id;

    -- +10 pts par RDV attribué (action_type='rdv_completed' utilisé pour V2.5,
    -- l'attribution est traitée comme un "lead reçu" à valoriser)
    INSERT INTO public.brh_employee_actions (
      employee_id, action_type, points,
      related_entity_type, related_entity_id, notes
    ) VALUES (
      NEW.assigned_employee_id, 'rdv_completed', 10,
      'appointment', NEW.id,
      format('RDV attribué — %s (%s)',
             COALESCE(NEW.contact_name, 'sans nom'),
             COALESCE(NEW.preferred_slot, 'créneau non précisé'))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_appointments_assigned_counter ON brh_appointments;
CREATE TRIGGER brh_appointments_assigned_counter
  AFTER INSERT ON brh_appointments
  FOR EACH ROW
  EXECUTE FUNCTION brh_appointments_increment_employee_counter();

-- Idem si UPDATE déplace l'assignment vers un autre employé
CREATE OR REPLACE FUNCTION brh_appointments_handle_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Cas : nouveau assigned_employee_id différent du précédent
  IF NEW.assigned_employee_id IS DISTINCT FROM OLD.assigned_employee_id THEN
    -- Décrémente l'ancien si non null
    IF OLD.assigned_employee_id IS NOT NULL THEN
      UPDATE public.brh_employees
      SET leads_received_this_month = GREATEST(0, leads_received_this_month - 1)
      WHERE id = OLD.assigned_employee_id;
    END IF;
    -- Incrémente le nouveau si non null
    IF NEW.assigned_employee_id IS NOT NULL THEN
      UPDATE public.brh_employees
      SET leads_received_this_month = leads_received_this_month + 1
      WHERE id = NEW.assigned_employee_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_appointments_reassign ON brh_appointments;
CREATE TRIGGER brh_appointments_reassign
  AFTER UPDATE OF assigned_employee_id ON brh_appointments
  FOR EACH ROW
  EXECUTE FUNCTION brh_appointments_handle_reassignment();

-- ----------------------------------------------------------------------------
-- 2. Fonction : reset mensuel des compteurs (à appeler par cron le 1er du mois)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_reset_employee_leads_counter()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.brh_employees
  SET leads_received_this_month = 0,
      updated_at = now()
  WHERE is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION brh_reset_employee_leads_counter IS
  'Phase Employé V2.5 — Reset mensuel du compteur leads_received_this_month.
  À appeler le 1er du mois via cron externe (n8n, systemd timer, pg_cron).
  Retourne le nombre d''employés concernés.';

-- ----------------------------------------------------------------------------
-- 3. Recompute initial : aligner leads_received_this_month avec les RDV du mois
-- ----------------------------------------------------------------------------
UPDATE brh_employees e
SET leads_received_this_month = (
  SELECT COUNT(*)
  FROM brh_appointments a
  WHERE a.assigned_employee_id = e.id
    AND a.created_at >= date_trunc('month', now())
);

COMMIT;
