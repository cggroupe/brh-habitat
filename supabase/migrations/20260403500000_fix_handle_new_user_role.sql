-- Migration: Fix handle_new_user() pour supporter les roles pro/particulier
-- Date: 2026-04-03
-- Probleme: Le trigger cree toujours role='user', ignorant le role passe dans raw_user_meta_data
-- Solution: Lire raw_user_meta_data->>'role' et valider contre les roles autorises

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Determiner le role depuis les metadata du signup
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

  -- Valider le role (securite : seuls ces roles sont autorises a l'inscription)
  IF v_role NOT IN ('user', 'pro', 'particulier') THEN
    v_role := 'user';
  END IF;

  -- Admin uniquement via email specifique (jamais via metadata)
  IF NEW.email = 'contact@contact-brh.fr' THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone, is_active, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    v_role,
    NEW.raw_user_meta_data ->> 'phone',
    true,
    'fr'
  );
  RETURN NEW;
END;
$$;
