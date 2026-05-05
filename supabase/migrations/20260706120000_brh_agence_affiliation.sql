-- =============================================================================
-- Phase 16.1 — Affiliation Agence (network marketing reverse)
-- =============================================================================
--
-- L'agence n'a PAS d'accès direct aux 60k+ prospects F/G. Pour débloquer
-- progressivement plus de leads + plus de features, elle doit RAPPORTER
-- des prospects travaux (propriétaires en vente qui ont besoin de rénover)
-- à BRH. Modèle gagnant-gagnant :
--
--   Agence : commission sur chantier signé (5 % HT) + bonus leads vente
--            débloqués + progression de palier (bronze → platinum)
--   BRH    : flux de leads travaux qualifiés (intention de vente +
--            besoin rénovation = signal très fort) pour ses Pro RGE
--
-- Paliers (overrides brh_agence_subscriptions.tier — la progression
-- contributions surchage le tier achetée Stripe) :
--   bronze    (0 chantiers signés)  → 5 leads/mois
--   silver    (3 chantiers signés)  → 30 leads/mois  + stats équipe
--   gold      (10 chantiers signés) → 100 leads/mois + courriers IA + carte chaleur
--   platinum  (25 chantiers signés) → illimité       + API + co-branding
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table contributions (leads travaux apportés par l'agence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Coordonnées du prospect propriétaire
  proprietaire_nom TEXT,
  proprietaire_prenom TEXT,
  proprietaire_telephone TEXT,
  proprietaire_email TEXT,
  consent_contact BOOLEAN NOT NULL DEFAULT FALSE,

  -- Bien
  adresse TEXT NOT NULL,
  code_postal CHAR(5),
  commune TEXT,
  departement CHAR(2),
  type_batiment TEXT,
  surface_estimee_m2 INT,
  etiquette_dpe_actuelle CHAR(1),

  -- Intention travaux
  travaux_envisages TEXT[],  -- ex: ['pac_air_eau', 'isolation_combles', 'fenetres']
  budget_estime_eur INT,
  urgence TEXT CHECK (urgence IN ('immediate','3mois','6mois','12mois','indecis')),
  contexte TEXT,             -- notes libres agence

  -- Statut workflow
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','qualified','audit_done','quote_signed','completed','rejected')),
  rejected_reason TEXT,

  -- Commission agence (déclenchée à chantier signé / completed)
  chantier_montant_ttc_cents BIGINT,
  commission_pct INTEGER DEFAULT 5,         -- 5 % par défaut
  commission_amount_cents BIGINT,
  commission_paid_at TIMESTAMPTZ,

  -- Liens vers le funnel BRH (rempli au fur et à mesure)
  brh_prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,
  audit_id UUID,                            -- brh_audits si audit produit
  quote_id UUID REFERENCES brh_quotes(id) ON DELETE SET NULL,
  assigned_pro_company_id UUID REFERENCES brh_companies(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agence_contrib_agence
  ON brh_agence_contributions(agence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_contrib_status
  ON brh_agence_contributions(status);
CREATE INDEX IF NOT EXISTS brh_agence_contrib_dept
  ON brh_agence_contributions(departement);

COMMENT ON TABLE brh_agence_contributions IS
  'Phase 16.1 — leads travaux apportés par les agences immo partenaires. Workflow submitted → qualified → audit_done → quote_signed → completed → commission versée.';

-- ----------------------------------------------------------------------------
-- 2. Table progression (état du palier de l'agence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_progression (
  agence_id UUID PRIMARY KEY REFERENCES brh_agences_immo(id) ON DELETE CASCADE,

  tier TEXT NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze','silver','gold','platinum')),

  contributions_count INTEGER NOT NULL DEFAULT 0,
  contributions_qualified INTEGER NOT NULL DEFAULT 0,
  chantiers_signes INTEGER NOT NULL DEFAULT 0,
  chantiers_completes INTEGER NOT NULL DEFAULT 0,

  total_commission_due_cents BIGINT NOT NULL DEFAULT 0,
  total_commission_paid_cents BIGINT NOT NULL DEFAULT 0,

  -- Bonus leads débloqués via contributions (au-dessus du quota tier de base)
  bonus_leads_unlocked INTEGER NOT NULL DEFAULT 0,
  bonus_leads_consumed INTEGER NOT NULL DEFAULT 0,

  -- Date dernière mise à jour des stats
  stats_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE brh_agence_progression IS
  'Phase 16.1 — état de progression de l''agence dans le système d''affiliation contributions. Auto-calculé via trigger sur brh_agence_contributions.';

-- ----------------------------------------------------------------------------
-- 3. Helper SECURITY DEFINER pour mettre à jour la progression
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_recompute_progression(p_agence_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_qualified INT;
  v_signed INT;
  v_completed INT;
  v_due BIGINT;
  v_paid BIGINT;
  v_tier TEXT;
  v_bonus_unlocked INT;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status IN ('qualified','audit_done','quote_signed','completed')),
    count(*) FILTER (WHERE status IN ('quote_signed','completed')),
    count(*) FILTER (WHERE status = 'completed'),
    coalesce(sum(commission_amount_cents) FILTER (WHERE status IN ('quote_signed','completed')), 0),
    coalesce(sum(commission_amount_cents) FILTER (WHERE commission_paid_at IS NOT NULL), 0)
  INTO v_count, v_qualified, v_signed, v_completed, v_due, v_paid
  FROM public.brh_agence_contributions
  WHERE agence_id = p_agence_id;

  -- Tier basé sur chantiers signés (plus engageant que juste submitted)
  v_tier := CASE
    WHEN v_signed >= 25 THEN 'platinum'
    WHEN v_signed >= 10 THEN 'gold'
    WHEN v_signed >= 3  THEN 'silver'
    ELSE 'bronze'
  END;

  -- Bonus leads débloqués : 5 leads bonus par chantier signé
  v_bonus_unlocked := v_signed * 5;

  INSERT INTO public.brh_agence_progression
    (agence_id, tier, contributions_count, contributions_qualified,
     chantiers_signes, chantiers_completes,
     total_commission_due_cents, total_commission_paid_cents,
     bonus_leads_unlocked, stats_updated_at, updated_at)
  VALUES
    (p_agence_id, v_tier, v_count, v_qualified, v_signed, v_completed,
     v_due, v_paid, v_bonus_unlocked, now(), now())
  ON CONFLICT (agence_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    contributions_count = EXCLUDED.contributions_count,
    contributions_qualified = EXCLUDED.contributions_qualified,
    chantiers_signes = EXCLUDED.chantiers_signes,
    chantiers_completes = EXCLUDED.chantiers_completes,
    total_commission_due_cents = EXCLUDED.total_commission_due_cents,
    total_commission_paid_cents = EXCLUDED.total_commission_paid_cents,
    bonus_leads_unlocked = EXCLUDED.bonus_leads_unlocked,
    stats_updated_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_agence_recompute_progression(UUID)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Trigger : recompute auto à chaque INSERT/UPDATE/DELETE contribution
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_contrib_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.brh_agence_recompute_progression(OLD.agence_id);
    RETURN OLD;
  ELSE
    PERFORM public.brh_agence_recompute_progression(NEW.agence_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_contrib_progression
  ON brh_agence_contributions;
CREATE TRIGGER trg_brh_agence_contrib_progression
  AFTER INSERT OR UPDATE OR DELETE ON brh_agence_contributions
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_contrib_trigger();

-- ----------------------------------------------------------------------------
-- 5. Updated_at auto
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_agence_contrib_updated ON brh_agence_contributions;
CREATE TRIGGER trg_brh_agence_contrib_updated
  BEFORE UPDATE ON brh_agence_contributions
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_agence_progression_updated ON brh_agence_progression;
CREATE TRIGGER trg_brh_agence_progression_updated
  BEFORE UPDATE ON brh_agence_progression
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_agence_progression ENABLE ROW LEVEL SECURITY;

-- Agence : voit/insert ses propres contributions
DROP POLICY IF EXISTS contrib_agence_select ON brh_agence_contributions;
CREATE POLICY contrib_agence_select ON brh_agence_contributions
  FOR SELECT TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS contrib_agence_insert ON brh_agence_contributions;
CREATE POLICY contrib_agence_insert ON brh_agence_contributions
  FOR INSERT TO authenticated
  WITH CHECK (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

-- Admin BRH : tout
DROP POLICY IF EXISTS contrib_admin_all ON brh_agence_contributions;
CREATE POLICY contrib_admin_all ON brh_agence_contributions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Progression : agence read-only sur la sienne, admin tout
DROP POLICY IF EXISTS progression_agence_select ON brh_agence_progression;
CREATE POLICY progression_agence_select ON brh_agence_progression
  FOR SELECT TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS progression_admin_all ON brh_agence_progression;
CREATE POLICY progression_admin_all ON brh_agence_progression
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7. Init progression bronze pour toutes les agences existantes
-- ----------------------------------------------------------------------------
INSERT INTO brh_agence_progression (agence_id, tier)
SELECT id, 'bronze' FROM brh_agences_immo
ON CONFLICT (agence_id) DO NOTHING;

COMMIT;

SELECT
  'contributions table' AS table_name, count(*) AS rows FROM brh_agence_contributions
UNION ALL
SELECT 'progression table', count(*) FROM brh_agence_progression;
