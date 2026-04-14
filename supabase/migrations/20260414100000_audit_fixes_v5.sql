-- =============================================================================
-- Migration: audit_fixes_v5
-- Date: 2026-04-14
-- Fixes: H1 estimated_budget TEXT→INT, H2 work_history.cost NUMERIC→INT,
--        H7 auto-create affiliate on signup, M8 CTE depth consistency
-- =============================================================================

-- H1: brh_prospects.estimated_budget TEXT → INTEGER (cents)
-- Valeurs existantes non-numeriques seront converties en 0
ALTER TABLE brh_prospects
  ALTER COLUMN estimated_budget TYPE INTEGER
  USING CASE
    WHEN estimated_budget ~ '^\d+$' THEN estimated_budget::INTEGER
    ELSE 0
  END;

ALTER TABLE brh_prospects
  ALTER COLUMN estimated_budget SET DEFAULT 0;

-- H2: brh_work_history.cost NUMERIC → INTEGER (cents)
-- Convertir en centimes (arrondi)
ALTER TABLE brh_work_history
  ALTER COLUMN cost TYPE INTEGER
  USING CASE
    WHEN cost IS NOT NULL THEN round(cost * 100)::INTEGER
    ELSE NULL
  END;

COMMENT ON COLUMN brh_work_history.cost IS 'Cout en centimes (INTEGER). Diviser par 100 pour affichage.';
COMMENT ON COLUMN brh_prospects.estimated_budget IS 'Budget estime en centimes (INTEGER). Diviser par 100 pour affichage.';

-- H7: Auto-creation de l'entree brh_affiliates pour les utilisateurs particulier
-- Modifier handle_new_user() pour inserer dans brh_affiliates quand role = particulier
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
  -- Determiner le role depuis les metadata
  _role := COALESCE(
    NEW.raw_user_meta_data ->> 'role',
    'user'
  );

  -- Verifier que le role est valide
  IF _role NOT IN ('user', 'admin', 'pro', 'particulier') THEN
    _role := 'user';
  END IF;

  -- Creer le profil
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, locale, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    _role,
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'fr'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = EXCLUDED.role;

  -- Auto-creer l'entree affiliate pour les particuliers
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

-- M8: Corriger la profondeur max du CTE recursif pour utiliser la valeur des settings
-- Au lieu de hardcoder 10, on utilise la valeur configurable (default 5)
-- DROP d'abord car la signature RETURNS TABLE a change
DROP FUNCTION IF EXISTS public.get_full_recruit_tree(UUID);
CREATE OR REPLACE FUNCTION public.get_full_recruit_tree(p_recruiter_id UUID)
RETURNS TABLE(
  id UUID,
  recruiter_id UUID,
  full_name TEXT,
  role TEXT,
  level_name TEXT,
  lvl INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _max_levels INT;
BEGIN
  -- Lire la profondeur max depuis les settings
  SELECT COALESCE(s.recruitment_max_levels, 5)
    INTO _max_levels
    FROM public.brh_platform_settings s
   WHERE s.key = 'global';

  IF _max_levels IS NULL THEN
    _max_levels := 5;
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    -- Niveau 1 : recrues directes
    SELECT
      a.id,
      a.recruited_by AS recruiter_id,
      p.full_name,
      p.role,
      COALESCE(a.level, 'standard') AS level_name,
      1 AS lvl
    FROM public.brh_affiliates a
    JOIN public.profiles p ON p.id = a.id
    WHERE a.recruited_by = p_recruiter_id

    UNION ALL

    -- Niveaux suivants
    SELECT
      a.id,
      a.recruited_by AS recruiter_id,
      p.full_name,
      p.role,
      COALESCE(a.level, 'standard') AS level_name,
      t.lvl + 1 AS lvl
    FROM public.brh_affiliates a
    JOIN public.profiles p ON p.id = a.id
    JOIN tree t ON t.id = a.recruited_by
    WHERE t.lvl < _max_levels
  )
  SELECT tree.id, tree.recruiter_id, tree.full_name, tree.role, tree.level_name, tree.lvl
  FROM tree
  ORDER BY tree.lvl, tree.full_name;
END;
$$;

-- Meme correction pour get_network_stats
DROP FUNCTION IF EXISTS public.get_network_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_network_stats(p_recruiter_id UUID)
RETURNS TABLE(
  total_recruits BIGINT,
  total_prospects BIGINT,
  total_signed BIGINT,
  total_commission BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _max_levels INT;
BEGIN
  SELECT COALESCE(s.recruitment_max_levels, 5)
    INTO _max_levels
    FROM public.brh_platform_settings s
   WHERE s.key = 'global';

  IF _max_levels IS NULL THEN
    _max_levels := 5;
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT a.id, 1 AS lvl
    FROM public.brh_affiliates a
    WHERE a.recruited_by = p_recruiter_id
    UNION ALL
    SELECT a.id, t.lvl + 1
    FROM public.brh_affiliates a
    JOIN tree t ON t.id = a.recruited_by
    WHERE t.lvl < _max_levels
  )
  SELECT
    (SELECT count(*) FROM tree)::BIGINT AS total_recruits,
    (SELECT count(*) FROM public.brh_prospects pr
     WHERE pr.affiliate_id IN (SELECT tree.id FROM tree)
        OR pr.company_id IN (
          SELECT cm.company_id FROM public.brh_company_members cm
          WHERE cm.profile_id IN (SELECT tree.id FROM tree)
        )
    )::BIGINT AS total_prospects,
    (SELECT count(*) FROM public.brh_quotes q
     JOIN public.brh_prospects pr2 ON pr2.id = q.prospect_id
     WHERE q.signed_at IS NOT NULL
       AND (pr2.affiliate_id IN (SELECT tree.id FROM tree)
            OR pr2.company_id IN (
              SELECT cm2.company_id FROM public.brh_company_members cm2
              WHERE cm2.profile_id IN (SELECT tree.id FROM tree)
            ))
    )::BIGINT AS total_signed,
    COALESCE((SELECT sum(rc.commission_amount) FROM public.brh_recruitment_commissions rc
     WHERE rc.recruiter_id = p_recruiter_id
    ), 0)::BIGINT AS total_commission;
END;
$$;
