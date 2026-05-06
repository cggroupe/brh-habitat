-- =============================================================================
-- Phase 16.1 Step C — Cascade marketing de réseau 5 niveaux pour agences
-- =============================================================================
--
-- Étend `brh_agence_referral_commissions` avec `chain_level` (1-5) et réécrit
-- le trigger `brh_agence_referral_commission_trigger` pour remonter la chaîne
-- des parrains via `brh_agences_immo.referred_by_agence_id` jusqu'à 5 niveaux.
--
-- Barème par niveau (cash + leads) :
--   Niveau 1 : 100 € HT + 5 leads
--   Niveau 2 :  25 € HT + 3 leads
--   Niveau 3 :  10 € HT + 2 leads
--   Niveau 4 :   5 € HT + 1 lead
--   Niveau 5 :   5 € HT + 1 lead
--   Total max par charte : 145 € HT + 12 leads distribués sur 5 ancêtres.
--
-- Le trigger Step A `brh_agence_credit_referral_leads` continue de fonctionner :
-- chaque INSERT d'une commission (peu importe le niveau) crédite des leads à
-- la column `referral_unlocked` du parrain. On ajuste ce trigger pour utiliser
-- le `leads_bonus_amount` stocké sur la ligne (variable selon niveau) plutôt
-- qu'une constante 5.
--
-- Anti-bug : #2 cents INTEGER, #5 throw, #11 TIMESTAMPTZ, #12 search_path=''.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Étendre brh_agence_referral_commissions
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_referral_commissions
  ADD COLUMN IF NOT EXISTS chain_level INTEGER NOT NULL DEFAULT 1
    CHECK (chain_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS leads_bonus_amount INTEGER NOT NULL DEFAULT 5
    CHECK (leads_bonus_amount >= 0 AND leads_bonus_amount <= 50);

CREATE INDEX IF NOT EXISTS brh_agence_referral_chain_idx
  ON brh_agence_referral_commissions(recruiter_agence_id, chain_level);

COMMENT ON COLUMN brh_agence_referral_commissions.chain_level IS
  'Phase 16.1 Step C — niveau dans la chaîne (1=parrain direct, 5=arrière-arrière-arrière-grand-parrain).';
COMMENT ON COLUMN brh_agence_referral_commissions.leads_bonus_amount IS
  'Phase 16.1 Step C — leads bonus crédités au parrain (variable par niveau).';

-- L'unicité initiale (recruiter, recruited, contract) reste valide :
-- pour un même contrat parrainé, chaque ancêtre n'a qu'UNE ligne.

-- ----------------------------------------------------------------------------
-- 2. Trigger cascade : remplace celui de Step 6 par version multi-niveaux
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_referral_commission_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current UUID;
  v_level INT;
  v_cash_cents INT;
  v_leads INT;
BEGIN
  -- Seulement à la transition vers 'active'
  IF NEW.status = 'active'
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active')
     AND NEW.partner_type = 'agence_immo'
     AND NEW.agence_id IS NOT NULL THEN

    -- Démarre la cascade : on remonte par referred_by_agence_id
    v_current := NEW.agence_id;
    v_level := 0;

    LOOP
      v_level := v_level + 1;
      EXIT WHEN v_level > 5;

      SELECT referred_by_agence_id INTO v_current
      FROM public.brh_agences_immo
      WHERE id = v_current;

      EXIT WHEN v_current IS NULL OR v_current = NEW.agence_id;

      -- Barème dégressif par niveau
      v_cash_cents := CASE v_level
        WHEN 1 THEN 10000   -- 100 € HT
        WHEN 2 THEN 2500    -- 25 € HT
        WHEN 3 THEN 1000    -- 10 € HT
        WHEN 4 THEN 500     -- 5 € HT
        WHEN 5 THEN 500     -- 5 € HT
      END;
      v_leads := CASE v_level
        WHEN 1 THEN 5
        WHEN 2 THEN 3
        WHEN 3 THEN 2
        WHEN 4 THEN 1
        WHEN 5 THEN 1
      END;

      INSERT INTO public.brh_agence_referral_commissions
        (recruiter_agence_id, recruited_agence_id, partner_contract_id,
         commission_amount_cents, leads_bonus_amount, chain_level, status)
      VALUES
        (v_current, NEW.agence_id, NEW.id,
         v_cash_cents, v_leads, v_level, 'pending')
      ON CONFLICT (recruiter_agence_id, recruited_agence_id, partner_contract_id)
        DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger lui-même reste sur AFTER INSERT OR UPDATE de brh_partner_contracts
-- (déjà créé par Step 6, on ne le remplace pas).

-- ----------------------------------------------------------------------------
-- 3. Mettre à jour `brh_agence_credit_referral_leads` pour utiliser le bonus
--    variable (au lieu de la constante 5 du Step A)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_credit_referral_leads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.brh_agence_progression
    (agence_id, referral_unlocked)
  VALUES
    (NEW.recruiter_agence_id, NEW.leads_bonus_amount)
  ON CONFLICT (agence_id) DO UPDATE SET
    referral_unlocked = public.brh_agence_progression.referral_unlocked + NEW.leads_bonus_amount,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC : retourne l'arbre descendant des filleuls (5 niveaux)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_get_my_referral_tree()
RETURNS TABLE (
  agence_id UUID,
  raison_sociale TEXT,
  commune TEXT,
  departement CHAR(2),
  status TEXT,
  chain_level INTEGER,
  parent_agence_id UUID,
  cash_earned_cents BIGINT,
  leads_earned INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE my_agence AS (
    SELECT pc.agence_id
    FROM public.brh_partner_contracts pc
    WHERE pc.signer_profile_id = auth.uid()
      AND pc.partner_type = 'agence_immo'
      AND pc.status = 'active'
    UNION
    SELECT am.agence_id
    FROM public.brh_agence_members am
    JOIN public.brh_partner_contracts pc
      ON pc.agence_id = am.agence_id
      AND pc.partner_type = 'agence_immo'
      AND pc.status = 'active'
    WHERE am.profile_id = auth.uid()
    LIMIT 1
  ),
  -- CTE récursive : descend dans l'arbre
  tree AS (
    -- Niveau 1 : enfants directs
    SELECT
      a.id AS agence_id,
      a.raison_sociale,
      a.commune,
      a.departement,
      a.status,
      1 AS chain_level,
      a.referred_by_agence_id AS parent_agence_id,
      a.created_at
    FROM public.brh_agences_immo a
    WHERE a.referred_by_agence_id = (SELECT agence_id FROM my_agence)

    UNION ALL

    -- Niveaux 2-5 : descendants
    SELECT
      child.id,
      child.raison_sociale,
      child.commune,
      child.departement,
      child.status,
      tree.chain_level + 1,
      tree.agence_id,
      child.created_at
    FROM public.brh_agences_immo child
    JOIN tree ON child.referred_by_agence_id = tree.agence_id
    WHERE tree.chain_level < 5
  )
  SELECT
    t.agence_id,
    t.raison_sociale,
    t.commune,
    t.departement,
    t.status,
    t.chain_level,
    t.parent_agence_id,
    coalesce(sum(c.commission_amount_cents)
      FILTER (WHERE c.status IN ('pending','validated','paid')), 0)::BIGINT AS cash_earned_cents,
    coalesce(sum(c.leads_bonus_amount), 0)::INTEGER AS leads_earned,
    t.created_at
  FROM tree t
  LEFT JOIN public.brh_agence_referral_commissions c
    ON c.recruited_agence_id = t.agence_id
    AND c.recruiter_agence_id = (SELECT agence_id FROM my_agence)
  GROUP BY t.agence_id, t.raison_sociale, t.commune, t.departement,
           t.status, t.chain_level, t.parent_agence_id, t.created_at
  ORDER BY t.chain_level, t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.brh_get_my_referral_tree() TO authenticated;

COMMENT ON FUNCTION public.brh_get_my_referral_tree IS
  'Phase 16.1 Step C — arbre descendant 5 niveaux du caller (agence). '
  'Retourne pour chaque filleul : niveau, parent, cash gagné, leads gagnés.';

COMMIT;

-- =============================================================================
-- Sanity checks
-- =============================================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'brh_agence_referral_commissions'
  AND column_name IN ('chain_level','leads_bonus_amount')
ORDER BY column_name;

SELECT proname FROM pg_proc
WHERE proname IN (
  'brh_agence_referral_commission_trigger',
  'brh_agence_credit_referral_leads',
  'brh_get_my_referral_tree'
)
ORDER BY proname;
