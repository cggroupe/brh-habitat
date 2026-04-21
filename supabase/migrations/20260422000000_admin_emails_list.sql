-- Migration: Liste d'emails administrateurs configurable
-- Date: 2026-04-22
-- Contexte: L'email admin etait hardcode dans handle_new_user() ('contact@contact-brh.fr').
--           Probleme securite : n'importe qui creant un compte avec cet email devient admin.
--           Fix : stocker la liste dans brh_platform_settings, editable via UI admin uniquement.

ALTER TABLE brh_platform_settings
  ADD COLUMN IF NOT EXISTS admin_emails TEXT[] DEFAULT ARRAY['contact@contact-brh.fr']::TEXT[];

-- Fonction helper : check si un email est dans la liste admin
-- SECURITY DEFINER pour bypass RLS (settings sont lisibles par tous authentifies mais
-- on veut que le trigger handle_new_user puisse y acceder)
CREATE OR REPLACE FUNCTION public.is_email_admin(p_email TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT COALESCE(
    p_email = ANY(admin_emails),
    false
  )
  FROM public.brh_platform_settings
  WHERE key = 'global'
  LIMIT 1;
$$;

-- Update du trigger handle_new_user pour utiliser la liste dynamique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _role TEXT;
  _ref_code TEXT;
BEGIN
  -- Determiner le role depuis les metadata Clerk (unsafeMetadata ou public_metadata)
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

  -- Valider le role (seuls user/pro/particulier autorises via signup public)
  IF _role NOT IN ('user', 'pro', 'particulier') THEN
    _role := 'user';
  END IF;

  -- Admin : check dans la liste dynamique brh_platform_settings.admin_emails
  IF public.is_email_admin(NEW.email) THEN
    _role := 'admin';
  END IF;

  -- Creer le profile
  INSERT INTO public.profiles (id, email, full_name, role, phone, is_active, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    _role,
    NEW.raw_user_meta_data ->> 'phone',
    true,
    'fr'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = EXCLUDED.role;

  -- Auto-creer l'entree affiliate pour les particuliers (parrainage via code court)
  IF _role = 'particulier' THEN
    _ref_code := 'BRH-' || upper(substr(md5(random()::text), 1, 8));

    INSERT INTO public.brh_affiliates (id, referral_code, short_code, points_balance, total_points_earned, level)
    VALUES (
      NEW.id,
      _ref_code,
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
      0,
      0,
      'standard'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Seuls les admins peuvent modifier admin_emails (deja dans RLS brh_platform_settings.ALL admin)
COMMENT ON COLUMN brh_platform_settings.admin_emails IS 'Liste des emails autorises a avoir role=admin. Editable via /admin/parametres.';
