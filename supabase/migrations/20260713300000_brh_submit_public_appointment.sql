-- =============================================================================
-- ROOT CAUSE fix RDV anonyme (12/05/2026 nuit + 8) — RPC SECURITY DEFINER
-- =============================================================================
-- Le ContactRdvModal côté frontend fait :
--   supabase.from('brh_appointments').insert(...).select('id').single()
--
-- Le `.select('id')` provoque un RETURNING qui est filtré par les policies
-- SELECT existantes. Or aucune policy SELECT n'autorise le rôle anon à lire
-- même son propre INSERT — toutes les SELECT exigent auth.uid()=user_id.
-- Conséquence : l'INSERT réussit côté DB (policy WITH CHECK OK) mais le
-- RETURNING via PostgREST plante avec 42501 (RLS violation), le frontend
-- voit une erreur générique « Une erreur inattendue est survenue ».
--
-- Fix : un RPC SECURITY DEFINER `brh_submit_public_appointment` qui :
--   - Bypass la RLS (SECURITY DEFINER + search_path='')
--   - Valide les inputs anti-spam (nom/email/phone obligatoires + type limité)
--   - INSERT le RDV avec user_id NULL
--   - Retourne directement l'UUID créé (pas de RETURNING via REST)
--
-- Le client n'a plus qu'à appeler supabase.rpc('brh_submit_public_appointment',...)
-- qui retourne l'UUID sans déclencher de SELECT/RETURNING RLS.
--
-- Cleanup : on garde la policy INSERT anon pour compat mais le frontend
-- utilisera désormais le RPC.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Cleanup policies de test laissées par le debug
DROP POLICY IF EXISTS rdv_anon_open ON brh_appointments;
DROP POLICY IF EXISTS rdv_auth_create ON brh_appointments;
DROP POLICY IF EXISTS test_anon_open ON brh_appointments;
DROP POLICY IF EXISTS anon_insert_appointments ON brh_appointments;

-- Re-create les policies prod canoniques
DROP POLICY IF EXISTS "Anonymous visitors can create public appointments" ON brh_appointments;
CREATE POLICY "Anonymous visitors can create public appointments" ON brh_appointments
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND contact_name IS NOT NULL AND length(trim(contact_name)) > 0
    AND contact_email IS NOT NULL AND length(trim(contact_email)) > 0
    AND contact_phone IS NOT NULL AND length(trim(contact_phone)) > 0
    AND type IN ('diagnostic', 'visite', 'suivi')
  );

DROP POLICY IF EXISTS "Anyone authenticated can create appointments" ON brh_appointments;
CREATE POLICY "Anyone authenticated can create appointments" ON brh_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- RPC publique : route fail-proof côté backend, contourne le bug RETURNING
CREATE OR REPLACE FUNCTION public.brh_submit_public_appointment(
  p_type TEXT,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_contact_email TEXT,
  p_preferred_slot TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_referral_code TEXT DEFAULT NULL,
  p_diagnostic_id UUID DEFAULT NULL,
  p_assigned_employee_id UUID DEFAULT NULL,
  p_requested_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Validations (anti-spam minimum)
  IF p_contact_name IS NULL OR length(trim(p_contact_name)) = 0 THEN
    RAISE EXCEPTION 'contact_name_required';
  END IF;
  IF p_contact_email IS NULL OR length(trim(p_contact_email)) = 0 THEN
    RAISE EXCEPTION 'contact_email_required';
  END IF;
  IF p_contact_phone IS NULL OR length(trim(p_contact_phone)) = 0 THEN
    RAISE EXCEPTION 'contact_phone_required';
  END IF;
  IF p_type NOT IN ('diagnostic', 'devis', 'visite', 'suivi') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;

  INSERT INTO public.brh_appointments (
    user_id, type, contact_name, contact_phone, contact_email,
    preferred_slot, notes, referral_code, diagnostic_id, assigned_employee_id,
    requested_date, status
  ) VALUES (
    auth.uid(),  -- NULL si anon, ou l'user.id si authentifié — tracé proprement
    p_type,
    trim(p_contact_name),
    trim(p_contact_phone),
    trim(p_contact_email),
    p_preferred_slot,
    p_notes,
    p_referral_code,
    p_diagnostic_id,
    p_assigned_employee_id,
    COALESCE(p_requested_date, now()),
    'demande'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.brh_submit_public_appointment IS
  'Soumission RDV public (anon ou authentifié). Bypass le bug RLS RETURNING
  qui plantait sur .select() après .insert() côté PostgREST. Validation
  anti-spam intégrée. Renvoie l''UUID du RDV créé. Cf migration
  20260713300000_brh_submit_public_appointment.sql';

-- Permettre à anon + authenticated d'appeler ce RPC
GRANT EXECUTE ON FUNCTION public.brh_submit_public_appointment(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ
) TO anon, authenticated;

COMMIT;
