-- =============================================================================
-- Phase 17.1 — Portail artisan enrichi (calque structurel Phase 16.1 agence)
-- =============================================================================
--
-- Objectif : faire de chaque artisan RGE BRH un acteur autonome de l'écosystème
-- avec ses propres outils de prospection, simulation, chiffrage, parrainage,
-- réseaux sociaux et progression gamifiée.
--
-- 6 nouvelles tables :
--   1. brh_artisan_contributions       — apport prospects (porte-à-porte)
--   2. brh_artisan_progression         — paliers bronze/silver/gold/platinum
--   3. brh_artisan_simulations         — simulations énergétiques sauvegardées
--   4. brh_artisan_chiffrages          — chiffrages travaux Batichiffrage sauvegardés
--   5. brh_artisan_social_posts        — publications réseaux soumises
--   6. brh_artisan_referral_commissions — commissions parrainage 100€ HT/charte
--
-- 3 helpers SECURITY DEFINER (avec SET search_path = '') :
--   - brh_user_artisan_id() : retourne l'artisan_id du user courant (NULL sinon)
--   - brh_artisan_recompute_progression(artisan_id)
--   - brh_get_public_artisan(artisan_id) : RPC publique vitrine
--
-- 3 triggers SQL :
--   - trg_brh_artisan_contrib_progression : recalcul palier sur changement
--   - trg_brh_artisan_social_reward       : +leads bonus sur post validé
--   - trg_brh_artisan_referral_commission : 100€ HT pending sur charte filleul
--
-- Conformité 14 règles anti-bug :
--   #2  → BIGINT cents pour tous les montants
--   #5  → COMMIT à la fin (transactionnel)
--   #8  → pas de USING (true) sur tables sensibles
--   #11 → TIMESTAMPTZ partout
--   #12 → SET search_path = '' sur toutes les fonctions SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Helper transverse : artisan_id du user courant
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_user_artisan_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.brh_artisans_rge
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_artisan_id()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_user_artisan_id() IS
  'Phase 17.1 — UUID de l''artisan_rge lié au user courant (NULL si non artisan). Utilisé par les RLS du portail artisan.';

-- ----------------------------------------------------------------------------
-- 1. brh_artisan_contributions (apport prospect porte-à-porte)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Prospect rencontré en physique
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
  travaux_envisages TEXT[],
  budget_estime_cents BIGINT,
  urgence TEXT CHECK (urgence IN ('immediate','3mois','6mois','12mois','indecis')),
  contexte_rencontre TEXT,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','qualified','audit_done','quote_signed','completed','rejected')),
  rejected_reason TEXT,

  -- Commission artisan (déclenchée à chantier signé)
  chantier_montant_ttc_cents BIGINT,
  commission_pct INTEGER DEFAULT 10,
  commission_amount_cents BIGINT,
  commission_paid_at TIMESTAMPTZ,

  -- Liens funnel BRH
  brh_prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,
  audit_id UUID,
  quote_id UUID REFERENCES brh_quotes(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_artisan_contrib_artisan
  ON brh_artisan_contributions(artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_artisan_contrib_status
  ON brh_artisan_contributions(status);
CREATE INDEX IF NOT EXISTS brh_artisan_contrib_dept
  ON brh_artisan_contributions(departement);

COMMENT ON TABLE brh_artisan_contributions IS
  'Phase 17.1 — prospects rencontrés en porte-à-porte par les artisans RGE. Workflow submitted → qualified → audit_done → quote_signed → completed.';

-- ----------------------------------------------------------------------------
-- 2. brh_artisan_progression (paliers gamifiés)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_progression (
  artisan_id UUID PRIMARY KEY REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,

  tier TEXT NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze','silver','gold','platinum')),

  contributions_count INTEGER NOT NULL DEFAULT 0,
  contributions_qualified INTEGER NOT NULL DEFAULT 0,
  chantiers_signes INTEGER NOT NULL DEFAULT 0,
  chantiers_completes INTEGER NOT NULL DEFAULT 0,

  filleuls_actifs INTEGER NOT NULL DEFAULT 0,

  total_commission_due_cents BIGINT NOT NULL DEFAULT 0,
  total_commission_paid_cents BIGINT NOT NULL DEFAULT 0,
  total_referral_due_cents BIGINT NOT NULL DEFAULT 0,
  total_referral_paid_cents BIGINT NOT NULL DEFAULT 0,

  bonus_leads_unlocked INTEGER NOT NULL DEFAULT 0,
  bonus_leads_consumed INTEGER NOT NULL DEFAULT 0,

  stats_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE brh_artisan_progression IS
  'Phase 17.1 — état de progression de l''artisan (tier + leads bonus + chiffres CA). Auto-calculé via trigger.';

-- ----------------------------------------------------------------------------
-- 3. brh_artisan_simulations (simulations énergétiques sauvegardées)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  label TEXT,                          -- libellé libre (ex: "Mme Dupont - 12 rue Paris")
  inputs JSONB NOT NULL,               -- adresse + paramètres saisis
  result JSONB,                        -- étude virtuelle (DPE estimé, scénarios, aides)
  source TEXT CHECK (source IN ('address','manual')) DEFAULT 'address',

  -- Lien optionnel vers une contribution si le prospect a été apporté ensuite
  contribution_id UUID REFERENCES brh_artisan_contributions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_artisan_sim_artisan
  ON brh_artisan_simulations(artisan_id, created_at DESC);

COMMENT ON TABLE brh_artisan_simulations IS
  'Phase 17.1 — simulations énergétiques BDNB CSTB sauvegardées par les artisans (BAN ou wizard manuel).';

-- ----------------------------------------------------------------------------
-- 4. brh_artisan_chiffrages (chiffrages travaux Batichiffrage sauvegardés)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_chiffrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  label TEXT,
  client_nom TEXT,
  adresse_chantier TEXT,

  -- Liste des ouvrages chiffrés (snapshot Batichiffrage à la date du chiffrage)
  ouvrages JSONB NOT NULL,             -- [{code, libelle, quantite, unite, prix_ht_cents, total_ht_cents}, ...]

  total_ht_cents BIGINT NOT NULL DEFAULT 0,
  marge_pct INTEGER DEFAULT 25,
  total_marge_cents BIGINT NOT NULL DEFAULT 0,
  tva_pct INTEGER DEFAULT 10,           -- 10% rénovation par défaut, 20% neuf
  total_ttc_cents BIGINT NOT NULL DEFAULT 0,

  -- Lien optionnel vers une simulation ou contribution
  simulation_id UUID REFERENCES brh_artisan_simulations(id) ON DELETE SET NULL,
  contribution_id UUID REFERENCES brh_artisan_contributions(id) ON DELETE SET NULL,

  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','signed','refused')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_artisan_chiff_artisan
  ON brh_artisan_chiffrages(artisan_id, created_at DESC);

COMMENT ON TABLE brh_artisan_chiffrages IS
  'Phase 17.1 — chiffrages travaux Batichiffrage sauvegardés. Tous les montants en cents (règle anti-bug #2).';

-- ----------------------------------------------------------------------------
-- 5. brh_artisan_social_posts (publications réseaux soumises)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok','google')),
  post_url TEXT NOT NULL,
  screenshot_url TEXT,
  comment TEXT,

  status TEXT NOT NULL DEFAULT 'attente_validation'
    CHECK (status IN ('attente_validation','validee','refusee')),
  refused_reason TEXT,
  validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,

  -- Récompense leads bonus crédités à la validation
  reward_leads INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_artisan_social_artisan
  ON brh_artisan_social_posts(artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_artisan_social_status
  ON brh_artisan_social_posts(status);

COMMENT ON TABLE brh_artisan_social_posts IS
  'Phase 17.1 — publications réseaux soumises par les artisans. Plafond 2 publications validées/mois.';

-- ----------------------------------------------------------------------------
-- 6. brh_artisan_referral_commissions (parrainage artisan→artisan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_artisan_referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  filleul_artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  partner_contract_id UUID REFERENCES brh_partner_contracts(id) ON DELETE SET NULL,

  commission_amount_cents BIGINT NOT NULL DEFAULT 10000, -- 100,00 €
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','validated','paid','cancelled')),

  validated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (parrain_artisan_id, filleul_artisan_id)
);

CREATE INDEX IF NOT EXISTS brh_artisan_ref_parrain
  ON brh_artisan_referral_commissions(parrain_artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_artisan_ref_status
  ON brh_artisan_referral_commissions(status);

COMMENT ON TABLE brh_artisan_referral_commissions IS
  'Phase 17.1 — commissions parrainage 100€ HT par artisan filleul actif. UNIQUE (parrain, filleul) pour éviter doubles.';

-- ----------------------------------------------------------------------------
-- 7. ALTER brh_artisans_rge — colonne referred_by_artisan_id (parrainage)
-- ----------------------------------------------------------------------------
ALTER TABLE brh_artisans_rge
  ADD COLUMN IF NOT EXISTS referred_by_artisan_id UUID
    REFERENCES brh_artisans_rge(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS brh_artisans_referred_by
  ON brh_artisans_rge(referred_by_artisan_id)
  WHERE referred_by_artisan_id IS NOT NULL;

COMMENT ON COLUMN brh_artisans_rge.referred_by_artisan_id IS
  'Phase 17.1 — artisan parrain (?ref=<id> au moment de l''onboarding). Déclenche commission 100€ HT à signature charte.';

-- ----------------------------------------------------------------------------
-- 8. Helper SECURITY DEFINER : recompute progression
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_artisan_recompute_progression(p_artisan_id UUID)
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
  v_filleuls INT;
  v_ref_due BIGINT;
  v_ref_paid BIGINT;
  v_social_bonus INT;
  v_tier TEXT;
  v_bonus_unlocked INT;
BEGIN
  -- Contributions
  SELECT
    count(*),
    count(*) FILTER (WHERE status IN ('qualified','audit_done','quote_signed','completed')),
    count(*) FILTER (WHERE status IN ('quote_signed','completed')),
    count(*) FILTER (WHERE status = 'completed'),
    coalesce(sum(commission_amount_cents) FILTER (WHERE status IN ('quote_signed','completed')), 0),
    coalesce(sum(commission_amount_cents) FILTER (WHERE commission_paid_at IS NOT NULL), 0)
  INTO v_count, v_qualified, v_signed, v_completed, v_due, v_paid
  FROM public.brh_artisan_contributions
  WHERE artisan_id = p_artisan_id;

  -- Filleuls actifs + commissions parrainage
  SELECT
    count(*) FILTER (WHERE status IN ('validated','paid')),
    coalesce(sum(commission_amount_cents) FILTER (WHERE status IN ('validated','paid')), 0),
    coalesce(sum(commission_amount_cents) FILTER (WHERE status = 'paid'), 0)
  INTO v_filleuls, v_ref_due, v_ref_paid
  FROM public.brh_artisan_referral_commissions
  WHERE parrain_artisan_id = p_artisan_id;

  -- Bonus leads sociaux validés (sum reward_leads sur 30 derniers jours)
  SELECT coalesce(sum(reward_leads), 0)
  INTO v_social_bonus
  FROM public.brh_artisan_social_posts
  WHERE artisan_id = p_artisan_id
    AND status = 'validee'
    AND validated_at >= now() - interval '30 days';

  -- Tier basé sur signed OR filleuls (max des deux paliers)
  v_tier := CASE
    WHEN v_signed >= 25 OR v_filleuls >= 8 THEN 'platinum'
    WHEN v_signed >= 10 OR v_filleuls >= 3 THEN 'gold'
    WHEN v_signed >= 3 OR v_filleuls >= 1 THEN 'silver'
    ELSE 'bronze'
  END;

  -- Bonus leads débloqués : 5 leads par chantier signé + bonus sociaux
  v_bonus_unlocked := (v_signed * 5) + v_social_bonus;

  INSERT INTO public.brh_artisan_progression
    (artisan_id, tier, contributions_count, contributions_qualified,
     chantiers_signes, chantiers_completes, filleuls_actifs,
     total_commission_due_cents, total_commission_paid_cents,
     total_referral_due_cents, total_referral_paid_cents,
     bonus_leads_unlocked, stats_updated_at, updated_at)
  VALUES
    (p_artisan_id, v_tier, v_count, v_qualified, v_signed, v_completed, v_filleuls,
     v_due, v_paid, v_ref_due, v_ref_paid, v_bonus_unlocked, now(), now())
  ON CONFLICT (artisan_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    contributions_count = EXCLUDED.contributions_count,
    contributions_qualified = EXCLUDED.contributions_qualified,
    chantiers_signes = EXCLUDED.chantiers_signes,
    chantiers_completes = EXCLUDED.chantiers_completes,
    filleuls_actifs = EXCLUDED.filleuls_actifs,
    total_commission_due_cents = EXCLUDED.total_commission_due_cents,
    total_commission_paid_cents = EXCLUDED.total_commission_paid_cents,
    total_referral_due_cents = EXCLUDED.total_referral_due_cents,
    total_referral_paid_cents = EXCLUDED.total_referral_paid_cents,
    bonus_leads_unlocked = EXCLUDED.bonus_leads_unlocked,
    stats_updated_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_artisan_recompute_progression(UUID)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. Trigger contributions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_artisan_contrib_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.brh_artisan_recompute_progression(OLD.artisan_id);
    RETURN OLD;
  ELSE
    PERFORM public.brh_artisan_recompute_progression(NEW.artisan_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_artisan_contrib_progression
  ON brh_artisan_contributions;
CREATE TRIGGER trg_brh_artisan_contrib_progression
  AFTER INSERT OR UPDATE OR DELETE ON brh_artisan_contributions
  FOR EACH ROW EXECUTE FUNCTION public.brh_artisan_contrib_trigger();

-- ----------------------------------------------------------------------------
-- 10. Trigger réseaux sociaux : crédite leads bonus à la validation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_artisan_social_reward_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_validated_this_month INT;
BEGIN
  -- Sur passage à status='validee', calcule et crédite le reward
  IF NEW.status = 'validee' AND (OLD.status IS NULL OR OLD.status <> 'validee') THEN
    -- Plafond : 2 publications validées dans le mois
    SELECT count(*)
    INTO v_validated_this_month
    FROM public.brh_artisan_social_posts
    WHERE artisan_id = NEW.artisan_id
      AND status = 'validee'
      AND validated_at >= date_trunc('month', now());

    IF v_validated_this_month >= 2 THEN
      -- Validée mais hors plafond mensuel : 0 lead bonus
      NEW.reward_leads := 0;
    ELSE
      -- Récompense par plateforme
      NEW.reward_leads := CASE NEW.platform
        WHEN 'tiktok'    THEN 8
        WHEN 'facebook'  THEN 5
        WHEN 'instagram' THEN 5
        WHEN 'linkedin'  THEN 5
        WHEN 'google'    THEN 3
        ELSE 0
      END;
    END IF;

    NEW.validated_at := now();
  END IF;

  -- Recalcul progression après validation
  IF TG_OP = 'UPDATE' AND NEW.status = 'validee' AND OLD.status <> 'validee' THEN
    PERFORM public.brh_artisan_recompute_progression(NEW.artisan_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_artisan_social_reward
  ON brh_artisan_social_posts;
CREATE TRIGGER trg_brh_artisan_social_reward
  BEFORE INSERT OR UPDATE ON brh_artisan_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.brh_artisan_social_reward_trigger();

-- ----------------------------------------------------------------------------
-- 11. Trigger parrainage : commission 100€ HT pending sur charte filleul active
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_artisan_referral_commission_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_filleul_artisan_id UUID;
  v_parrain_artisan_id UUID;
BEGIN
  -- Ne traiter que les chartes d'artisan qui passent à 'active'
  -- (CHECK constraint partner_type autorise 'artisan_rge', pas 'artisan')
  IF NEW.partner_type <> 'artisan_rge' THEN RETURN NEW; END IF;
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;

  -- Trouver l'artisan_id du signataire
  SELECT id INTO v_filleul_artisan_id
  FROM public.brh_artisans_rge
  WHERE profile_id = NEW.signer_profile_id
  LIMIT 1;

  IF v_filleul_artisan_id IS NULL THEN RETURN NEW; END IF;

  -- Y a-t-il un parrain ?
  SELECT referred_by_artisan_id INTO v_parrain_artisan_id
  FROM public.brh_artisans_rge
  WHERE id = v_filleul_artisan_id;

  IF v_parrain_artisan_id IS NULL THEN RETURN NEW; END IF;

  -- Insert commission pending (UNIQUE empêche les doubles)
  INSERT INTO public.brh_artisan_referral_commissions
    (parrain_artisan_id, filleul_artisan_id, partner_contract_id, status)
  VALUES
    (v_parrain_artisan_id, v_filleul_artisan_id, NEW.id, 'pending')
  ON CONFLICT (parrain_artisan_id, filleul_artisan_id) DO NOTHING;

  -- Recalcul progression du parrain
  PERFORM public.brh_artisan_recompute_progression(v_parrain_artisan_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_artisan_referral_commission
  ON brh_partner_contracts;
CREATE TRIGGER trg_brh_artisan_referral_commission
  AFTER INSERT OR UPDATE ON brh_partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.brh_artisan_referral_commission_trigger();

-- ----------------------------------------------------------------------------
-- 12. RPC publique vitrine artisan
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_get_public_artisan(p_artisan_id UUID)
RETURNS TABLE (
  id UUID,
  nom_entreprise TEXT,
  commune TEXT,
  code_postal CHAR(5),
  departement CHAR(2),
  rge_certifications JSONB,
  geste_specialites TEXT[],
  score_qualite SMALLINT,
  nombre_chantiers_brh INTEGER,
  tier TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id,
    a.nom_entreprise,
    a.commune,
    a.code_postal,
    a.departement,
    a.rge_certifications,
    a.geste_specialites,
    a.score_qualite,
    a.nombre_chantiers_brh,
    coalesce(p.tier, 'bronze')
  FROM public.brh_artisans_rge a
  LEFT JOIN public.brh_artisan_progression p ON p.artisan_id = a.id
  WHERE a.id = p_artisan_id
    AND a.marketplace_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.brh_get_public_artisan(UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.brh_get_public_artisan(UUID) IS
  'Phase 17.1 — RPC publique pour la vitrine /r/:artisanId. Filtre marketplace_active=true (artisans hors marketplace invisibles).';

-- ----------------------------------------------------------------------------
-- 13. Updated_at auto sur les 6 tables
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_artisan_contrib_updated ON brh_artisan_contributions;
CREATE TRIGGER trg_brh_artisan_contrib_updated
  BEFORE UPDATE ON brh_artisan_contributions
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_artisan_progression_updated ON brh_artisan_progression;
CREATE TRIGGER trg_brh_artisan_progression_updated
  BEFORE UPDATE ON brh_artisan_progression
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_artisan_sim_updated ON brh_artisan_simulations;
CREATE TRIGGER trg_brh_artisan_sim_updated
  BEFORE UPDATE ON brh_artisan_simulations
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_artisan_chiff_updated ON brh_artisan_chiffrages;
CREATE TRIGGER trg_brh_artisan_chiff_updated
  BEFORE UPDATE ON brh_artisan_chiffrages
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_artisan_social_updated ON brh_artisan_social_posts;
CREATE TRIGGER trg_brh_artisan_social_updated
  BEFORE UPDATE ON brh_artisan_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_artisan_ref_updated ON brh_artisan_referral_commissions;
CREATE TRIGGER trg_brh_artisan_ref_updated
  BEFORE UPDATE ON brh_artisan_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_artisan_contributions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_progression        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_simulations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_chiffrages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_social_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_referral_commissions ENABLE ROW LEVEL SECURITY;

-- Helper de policy : "owner artisan" = ce que retourne brh_user_artisan_id()
-- Admin BRH : passe par EXISTS profiles.role='admin'

-- ----- contributions
DROP POLICY IF EXISTS artisan_contrib_owner_select ON brh_artisan_contributions;
CREATE POLICY artisan_contrib_owner_select ON brh_artisan_contributions
  FOR SELECT TO authenticated
  USING (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_contrib_owner_insert ON brh_artisan_contributions;
CREATE POLICY artisan_contrib_owner_insert ON brh_artisan_contributions
  FOR INSERT TO authenticated
  WITH CHECK (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_contrib_admin_all ON brh_artisan_contributions;
CREATE POLICY artisan_contrib_admin_all ON brh_artisan_contributions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- progression (owner read-only, admin all)
DROP POLICY IF EXISTS artisan_progression_owner_select ON brh_artisan_progression;
CREATE POLICY artisan_progression_owner_select ON brh_artisan_progression
  FOR SELECT TO authenticated
  USING (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_progression_admin_all ON brh_artisan_progression;
CREATE POLICY artisan_progression_admin_all ON brh_artisan_progression
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- simulations (CRUD owner)
DROP POLICY IF EXISTS artisan_sim_owner_all ON brh_artisan_simulations;
CREATE POLICY artisan_sim_owner_all ON brh_artisan_simulations
  FOR ALL TO authenticated
  USING (artisan_id = public.brh_user_artisan_id())
  WITH CHECK (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_sim_admin_all ON brh_artisan_simulations;
CREATE POLICY artisan_sim_admin_all ON brh_artisan_simulations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- chiffrages (CRUD owner)
DROP POLICY IF EXISTS artisan_chiff_owner_all ON brh_artisan_chiffrages;
CREATE POLICY artisan_chiff_owner_all ON brh_artisan_chiffrages
  FOR ALL TO authenticated
  USING (artisan_id = public.brh_user_artisan_id())
  WITH CHECK (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_chiff_admin_all ON brh_artisan_chiffrages;
CREATE POLICY artisan_chiff_admin_all ON brh_artisan_chiffrages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- social posts (artisan select+insert, admin update)
DROP POLICY IF EXISTS artisan_social_owner_select ON brh_artisan_social_posts;
CREATE POLICY artisan_social_owner_select ON brh_artisan_social_posts
  FOR SELECT TO authenticated
  USING (artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_social_owner_insert ON brh_artisan_social_posts;
CREATE POLICY artisan_social_owner_insert ON brh_artisan_social_posts
  FOR INSERT TO authenticated
  WITH CHECK (artisan_id = public.brh_user_artisan_id() AND status = 'attente_validation');

DROP POLICY IF EXISTS artisan_social_admin_all ON brh_artisan_social_posts;
CREATE POLICY artisan_social_admin_all ON brh_artisan_social_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- referral commissions (parrain read-only, admin all)
DROP POLICY IF EXISTS artisan_ref_parrain_select ON brh_artisan_referral_commissions;
CREATE POLICY artisan_ref_parrain_select ON brh_artisan_referral_commissions
  FOR SELECT TO authenticated
  USING (parrain_artisan_id = public.brh_user_artisan_id());

DROP POLICY IF EXISTS artisan_ref_admin_all ON brh_artisan_referral_commissions;
CREATE POLICY artisan_ref_admin_all ON brh_artisan_referral_commissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 15. Init progression bronze pour tous les artisans existants liés à un profil
-- ----------------------------------------------------------------------------
INSERT INTO brh_artisan_progression (artisan_id, tier)
SELECT id, 'bronze'
FROM brh_artisans_rge
WHERE profile_id IS NOT NULL
ON CONFLICT (artisan_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Vérification post-migration (lecture seule, pas de COMMIT)
-- =============================================================================
SELECT
  'contributions' AS table_name, count(*) AS rows FROM brh_artisan_contributions
UNION ALL SELECT 'progression',          count(*) FROM brh_artisan_progression
UNION ALL SELECT 'simulations',          count(*) FROM brh_artisan_simulations
UNION ALL SELECT 'chiffrages',           count(*) FROM brh_artisan_chiffrages
UNION ALL SELECT 'social_posts',         count(*) FROM brh_artisan_social_posts
UNION ALL SELECT 'referral_commissions', count(*) FROM brh_artisan_referral_commissions;
