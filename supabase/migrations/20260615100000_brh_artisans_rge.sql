-- Migration Phase 13.6 — Marketplace artisans RGE
-- Killer feature business : matching prospect ↔ artisan local breton.
--
-- Workflow :
--   1. Pro RGE audite un prospect, courrier IA Phase 13 envoyé
--   2. Si signature → suggestion d'artisans RGE bretons par geste (PAC, isolation, etc.)
--   3. Recommandation pro → artisan reçoit le lead
--   4. Conversion → commission BRH (5-10% du chantier, plafonné)
--
-- Source initiale artisans : annuaire RGE ADEME (data.ademe.fr/datasets/liste-des-entreprises-rge-2)

-- ============================================================================
-- brh_artisans_rge — annuaire enrichi des artisans RGE bretons
-- ============================================================================
CREATE TABLE brh_artisans_rge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  siret CHAR(14) UNIQUE NOT NULL,
  nom_entreprise TEXT NOT NULL,
  representant TEXT,                            -- nom du dirigeant
  email TEXT,
  telephone TEXT,
  site_web TEXT,

  -- Géo
  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  code_insee CHAR(5) NOT NULL,
  departement CHAR(2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Spécialités (geste IDs cohérents avec score-v2 et brh_aides_locales.geste_id)
  geste_specialites TEXT[] NOT NULL DEFAULT '{}',
  -- Ex: ['pac_air_eau', 'pac_eau_eau', 'isolation_combles', 'isolation_murs_ite', 'fenetres_double_vitrage']

  -- Certifications RGE actives (avec date_fin_validite)
  rge_certifications JSONB,
  -- Ex: [{ "nom_certificat": "QualiPAC", "organisme": "Qualibat", "date_fin": "2027-06-30" }]

  -- Score qualité (cf. computeArtisanScore — Phase 13.6.1+ : Bayesian update post-feedback)
  score_qualite SMALLINT CHECK (score_qualite BETWEEN 0 AND 100),
  nombre_chantiers_lifetime INTEGER NOT NULL DEFAULT 0,
  nombre_chantiers_brh INTEGER NOT NULL DEFAULT 0,
  taux_conversion_brh NUMERIC(4, 3),            -- 0-1, % leads BRH convertis en chantier

  -- Visibilité marketplace
  marketplace_active BOOLEAN NOT NULL DEFAULT true,
  marketplace_premium BOOLEAN NOT NULL DEFAULT false, -- Phase 13.6.1 : abonnement payant pour boost

  -- Méta
  source TEXT DEFAULT 'ademe_rge_v2',           -- 'ademe_rge_v2' | 'manual' | 'partner_invite'
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_artisans_geste ON brh_artisans_rge USING GIN (geste_specialites);
CREATE INDEX brh_artisans_dept ON brh_artisans_rge(departement, marketplace_active);
CREATE INDEX brh_artisans_insee ON brh_artisans_rge(code_insee);
CREATE INDEX brh_artisans_score ON brh_artisans_rge(score_qualite DESC NULLS LAST) WHERE marketplace_active = true;
CREATE INDEX brh_artisans_marketplace ON brh_artisans_rge(marketplace_premium DESC, score_qualite DESC) WHERE marketplace_active = true;

-- ============================================================================
-- brh_artisan_leads — leads transmis aux artisans (matching prospect ↔ artisan)
-- ============================================================================
CREATE TABLE brh_artisan_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Liens
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  prospect_id BIGINT NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  recommended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- pro RGE qui a recommandé

  -- Contexte
  geste TEXT NOT NULL,                          -- 'pac_air_eau', 'isolation_combles', etc.
  estimated_chantier_ttc_eur NUMERIC(10, 2),    -- estimation chiffrage moteur BRH
  expected_commission_eur NUMERIC(10, 2),       -- commission BRH (5-10% selon palier marketplace)

  -- Statut workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',         -- transmis à l'artisan, pas encore de réponse
    'accepted',        -- artisan a accepté (devis en cours)
    'declined',        -- artisan a refusé (pas dispo, hors zone, etc.)
    'quoted',          -- devis fait par l'artisan
    'signed',          -- chantier signé
    'completed',       -- chantier terminé + facture
    'canceled'         -- particulier ou artisan annule
  )),
  status_reason TEXT,                            -- raison decline/cancel
  responded_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Conversion
  actual_chantier_ttc_eur NUMERIC(10, 2),       -- prix réel chantier signé
  commission_paid_eur NUMERIC(10, 2),           -- commission BRH effectivement reversée
  commission_paid_at TIMESTAMPTZ,

  -- Méta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Anti-doublon : 1 prospect ne peut être recommandé qu'1 fois pour le même geste
  UNIQUE(prospect_id, geste)
);

CREATE INDEX brh_artisan_leads_artisan ON brh_artisan_leads(artisan_id, status);
CREATE INDEX brh_artisan_leads_prospect ON brh_artisan_leads(prospect_id);
CREATE INDEX brh_artisan_leads_status ON brh_artisan_leads(status, created_at DESC);
CREATE INDEX brh_artisan_leads_recommender ON brh_artisan_leads(recommended_by, created_at DESC);

-- ============================================================================
-- Trigger updated_at sur les 2 tables
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_artisans_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brh_artisans_rge_updated_at
  BEFORE UPDATE ON brh_artisans_rge
  FOR EACH ROW
  EXECUTE FUNCTION brh_artisans_set_updated_at();

CREATE TRIGGER brh_artisan_leads_updated_at
  BEFORE UPDATE ON brh_artisan_leads
  FOR EACH ROW
  EXECUTE FUNCTION brh_artisans_set_updated_at();

-- ============================================================================
-- Helper SQL : update du score qualité après lead complété (Phase 13.6.1+)
-- Bayesian-style : score_new = α * score_old + (1-α) * outcome_score
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_update_artisan_score(p_artisan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  total_leads INTEGER;
  signed_leads INTEGER;
  completed_leads INTEGER;
  conversion_rate NUMERIC(4, 3);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('signed', 'completed')), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_leads, signed_leads, completed_leads
  FROM public.brh_artisan_leads
  WHERE artisan_id = p_artisan_id;

  IF total_leads = 0 THEN
    RETURN;
  END IF;

  conversion_rate := signed_leads::NUMERIC / total_leads::NUMERIC;

  UPDATE public.brh_artisans_rge
  SET
    nombre_chantiers_brh = signed_leads,
    taux_conversion_brh = conversion_rate,
    score_qualite = LEAST(100, GREATEST(0, ROUND(50 + conversion_rate * 50)::INTEGER))
  WHERE id = p_artisan_id;
END;
$$;

COMMENT ON FUNCTION brh_update_artisan_score IS
  'Recalcule score_qualite + taux_conversion d''un artisan. À appeler après chaque update statut lead. Phase 13.6.1+ : ajout pondération Bayesian + reviews texte.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE brh_artisans_rge ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_artisan_leads ENABLE ROW LEVEL SECURITY;

-- Artisans : lecture publique pour ceux marketplace_active=true (catalogue searchable)
CREATE POLICY "public_select_active_artisans" ON brh_artisans_rge FOR SELECT
  TO anon, authenticated
  USING (marketplace_active = true);

-- Écriture admin uniquement (les artisans seront onboardés via process invite Phase 13.6.1+)
CREATE POLICY "admin_write_artisans" ON brh_artisans_rge FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Leads : pro RGE voit ceux qu'il a recommandés
CREATE POLICY "pro_select_own_recommendations" ON brh_artisan_leads FOR SELECT
  TO authenticated
  USING (
    recommended_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Pro insert ses propres recommandations
CREATE POLICY "pro_insert_recommendation" ON brh_artisan_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    recommended_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('pro', 'admin')
    )
  );

-- Update : pro propriétaire ou admin
CREATE POLICY "pro_update_own_recommendation" ON brh_artisan_leads FOR UPDATE
  TO authenticated
  USING (
    recommended_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE brh_artisans_rge IS
  'Annuaire enrichi des artisans RGE bretons — Phase 13.6 marketplace. Source : annuaire RGE ADEME + saisie manuelle + invitations partenaires. Score qualité Bayesian post-feedback.';

COMMENT ON TABLE brh_artisan_leads IS
  'Leads transmis aux artisans via marketplace BRH. Workflow pending → accepted → quoted → signed → completed. Commission BRH 5-10% selon palier artisan (Phase 13.6.1).';
