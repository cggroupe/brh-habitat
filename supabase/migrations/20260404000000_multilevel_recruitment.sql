-- Migration: Recrutement multi-niveaux (pyramide)
-- Date: 2026-04-04
-- Chaque recruteur dans la chaine touche 2.5% du montant original
-- Maximum 5 niveaux de profondeur

-- ============================================================
-- Setting : nombre max de niveaux
-- ============================================================
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS recruitment_max_levels INTEGER DEFAULT 5;

-- Colonne level pour savoir a quel niveau de la chaine la commission est generee
ALTER TABLE brh_recruitment_commissions ADD COLUMN IF NOT EXISTS chain_level INTEGER DEFAULT 1;

-- ============================================================
-- Remplacer le trigger pour remonter toute la chaine
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_recruitment_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_prospect RECORD;
  v_rate INTEGER;
  v_max_levels INTEGER;
  v_current_id UUID;     -- ID de la personne dont on cherche le recruteur
  v_recruiter_id UUID;
  v_commission INTEGER;
  v_level INTEGER := 0;
  v_source_type TEXT;
  v_source_amount INTEGER;
BEGIN
  -- Recuperer le prospect lie au devis
  SELECT * INTO v_prospect FROM public.brh_prospects WHERE id = NEW.prospect_id;
  IF v_prospect IS NULL THEN RETURN NEW; END IF;

  -- Recuperer les parametres
  SELECT recruitment_commission_percent, recruitment_max_levels
  INTO v_rate, v_max_levels
  FROM public.brh_platform_settings WHERE key = 'global';

  IF v_rate IS NULL OR v_rate = 0 THEN RETURN NEW; END IF;
  IF v_max_levels IS NULL THEN v_max_levels := 5; END IF;

  -- Determiner le point de depart de la chaine et le type de source
  IF v_prospect.source_type = 'pro' AND v_prospect.company_id IS NOT NULL THEN
    -- Source pro : le premier dans la chaine est le owner de l'entreprise
    SELECT owner_id INTO v_current_id FROM public.brh_companies WHERE id = v_prospect.company_id;
    v_source_type := 'commission_pro';
    v_source_amount := COALESCE(NEW.commission_amount, 0);
  ELSIF v_prospect.source_type = 'particulier' AND v_prospect.affiliate_id IS NOT NULL THEN
    -- Source particulier : le premier dans la chaine est l'affilie
    v_current_id := v_prospect.affiliate_id;
    v_source_type := 'points_particulier';
    v_source_amount := COALESCE(NEW.points_awarded, 0);
  ELSE
    RETURN NEW;
  END IF;

  IF v_source_amount = 0 OR v_current_id IS NULL THEN RETURN NEW; END IF;

  -- Remonter la chaine des recruteurs
  LOOP
    v_level := v_level + 1;
    IF v_level > v_max_levels THEN EXIT; END IF;

    -- Trouver le recruteur du current_id
    -- Chercher d'abord dans brh_affiliates, puis dans brh_companies
    SELECT recruited_by INTO v_recruiter_id FROM public.brh_affiliates WHERE id = v_current_id;

    IF v_recruiter_id IS NULL THEN
      -- Peut-etre un pro : chercher via sa company
      SELECT c.recruited_by INTO v_recruiter_id
      FROM public.brh_companies c
      WHERE c.owner_id = v_current_id
      LIMIT 1;
    END IF;

    -- Pas de recruteur a ce niveau → fin de la chaine
    IF v_recruiter_id IS NULL THEN EXIT; END IF;

    -- Calculer la commission pour ce recruteur
    v_commission := (v_source_amount * v_rate / 10000);

    IF v_commission > 0 THEN
      -- Inserer la commission de recrutement
      INSERT INTO public.brh_recruitment_commissions
        (recruiter_id, recruited_id, source_type, source_amount, commission_rate_percent, commission_amount, reference_id, chain_level)
      VALUES
        (v_recruiter_id, v_current_id, v_source_type, v_source_amount, v_rate, v_commission, NEW.id, v_level);

      -- Si le recruteur est un affilie, crediter les points directement
      IF v_source_type = 'points_particulier' THEN
        UPDATE public.brh_affiliates
        SET points_balance = points_balance + v_commission,
            total_points_earned = total_points_earned + v_commission
        WHERE id = v_recruiter_id;

        INSERT INTO public.brh_points_transactions
          (affiliate_id, points, type, reference_id, description)
        VALUES
          (v_recruiter_id, v_commission, 'bonus_mensuel', NEW.id,
           'Commission recrutement niveau ' || v_level || ' - parrainage de votre reseau');
      END IF;
    END IF;

    -- Remonter d'un cran
    v_current_id := v_recruiter_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC : arborescence complete des recrues (recursive)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_full_recruit_tree(p_recruiter_id UUID)
RETURNS TABLE(
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  depth INTEGER,
  direct_recruiter_id UUID,
  prospects_count BIGINT,
  signed_count BIGINT
) AS $$
  WITH RECURSIVE tree AS (
    -- Base : recrues directes (affilies + companies combinés)
    SELECT x.pid, 1 AS lvl, p_recruiter_id AS parent_id
    FROM (
      SELECT a.id AS pid FROM public.brh_affiliates a WHERE a.recruited_by = p_recruiter_id
      UNION
      SELECT c.owner_id AS pid FROM public.brh_companies c WHERE c.recruited_by = p_recruiter_id AND c.owner_id IS NOT NULL
    ) x
    UNION ALL
    -- Recursion : niveaux suivants
    SELECT x2.pid, t.lvl + 1 AS lvl, t.pid AS parent_id
    FROM tree t
    CROSS JOIN LATERAL (
      SELECT a2.id AS pid FROM public.brh_affiliates a2 WHERE a2.recruited_by = t.pid
      UNION
      SELECT c2.owner_id AS pid FROM public.brh_companies c2 WHERE c2.recruited_by = t.pid AND c2.owner_id IS NOT NULL
    ) x2
    WHERE t.lvl < 10
  )
  SELECT
    pr.id AS profile_id,
    pr.full_name,
    pr.email,
    pr.role,
    pr.created_at,
    t.lvl AS depth,
    t.parent_id AS direct_recruiter_id,
    COALESCE(ps.total, 0) AS prospects_count,
    COALESCE(ps.signed, 0) AS signed_count
  FROM tree t
  JOIN public.profiles pr ON pr.id = t.pid
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.status IN ('signe', 'termine')) AS signed
    FROM public.brh_prospects p
    WHERE p.affiliate_id = t.pid
       OR p.company_id IN (SELECT cc.id FROM public.brh_companies cc WHERE cc.owner_id = t.pid)
  ) ps ON true
  ORDER BY t.lvl, pr.full_name;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================
-- RPC : stats agregees du reseau complet
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_network_stats(p_recruiter_id UUID)
RETURNS TABLE(
  total_recruits BIGINT,
  total_levels BIGINT,
  total_prospects BIGINT,
  total_signed BIGINT,
  total_commission_earned BIGINT
) AS $$
  WITH RECURSIVE tree AS (
    SELECT x.pid, 1 AS lvl FROM (
      SELECT a.id AS pid FROM public.brh_affiliates a WHERE a.recruited_by = p_recruiter_id
      UNION
      SELECT c.owner_id AS pid FROM public.brh_companies c WHERE c.recruited_by = p_recruiter_id AND c.owner_id IS NOT NULL
    ) x
    UNION ALL
    SELECT x2.pid, t.lvl + 1 FROM tree t
    CROSS JOIN LATERAL (
      SELECT a2.id AS pid FROM public.brh_affiliates a2 WHERE a2.recruited_by = t.pid
      UNION
      SELECT c2.owner_id AS pid FROM public.brh_companies c2 WHERE c2.recruited_by = t.pid AND c2.owner_id IS NOT NULL
    ) x2
    WHERE t.lvl < 10
  )
  SELECT
    (SELECT COUNT(DISTINCT pid) FROM tree) AS total_recruits,
    (SELECT COALESCE(MAX(lvl), 0) FROM tree) AS total_levels,
    (SELECT COUNT(*) FROM public.brh_prospects WHERE affiliate_id IN (SELECT pid FROM tree) OR company_id IN (SELECT cc.id FROM public.brh_companies cc WHERE cc.owner_id IN (SELECT pid FROM tree))) AS total_prospects,
    (SELECT COUNT(*) FROM public.brh_prospects WHERE (affiliate_id IN (SELECT pid FROM tree) OR company_id IN (SELECT cc.id FROM public.brh_companies cc WHERE cc.owner_id IN (SELECT pid FROM tree))) AND status IN ('signe','termine')) AS total_signed,
    COALESCE((SELECT SUM(commission_amount) FROM public.brh_recruitment_commissions WHERE recruiter_id = p_recruiter_id), 0) AS total_commission_earned;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
