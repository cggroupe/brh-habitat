-- ============================================================================
-- Phase 16.0.1 — Score Vente Agences Immo (fondations DB)
-- ============================================================================
--
-- Objectifs :
--   1. brh_score_vente_v1       : cache du scoring vente par prospect (13 règles)
--   2. brh_optout_requests      : demandes opt-out RGPD (Art. 21 droit d'opposition)
--   3. brh_lead_assignments     : exclusivité lead → 1 agence pendant 30j (anti-doublon)
--   4. brh_partner_contracts    : chartes signées électroniquement (preuve eIDAS)
--   5. brh_score_vente_compute  : helper SQL trigger refresh (recalcul à la volée)
--
-- Approche modèle Hoguet "A" (vendeur de leads scorés, sans transaction directe) :
--   - BRH ne génère PAS de courriers au nom des agences
--   - Les leads sont des FICHES OPPORTUNITÉ (adresse + DPE + score), pas des
--     "mises en relation" formelles
--   - Pas de carte T requise pour ce modèle
--
-- Mirroir code TS : src/lib/dpe-engine/score-vente/index.ts (Phase 16.0.2)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. brh_score_vente_v1 — cache du scoring par prospect DPE
-- ----------------------------------------------------------------------------
-- Heuristique 13 règles. Chaque prospect a UN score vente (0-100) calculé sur
-- les signaux disponibles : âge propriétaire, durée détention, mutation 24m,
-- DPE F/G + ancienneté, situation IRIS, distance moyenne entre transactions, etc.
CREATE TABLE IF NOT EXISTS brh_score_vente_v1 (
  prospect_id BIGINT PRIMARY KEY REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,

  /** Score 0-100. NULL = pas encore calculé. */
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),

  /** Segment : "tres_chaud" >= 80, "chaud" >= 60, "tiede" >= 40, "froid" < 40. */
  segment TEXT CHECK (segment IN ('tres_chaud','chaud','tiede','froid')),

  /** Détail des règles déclenchées (debug + audit). JSONB { rule_id: points }. */
  rules_breakdown JSONB DEFAULT '{}'::jsonb,

  /** Probabilité estimée de vente sous 6 mois (0.0 à 1.0). Heuristique simplifiée. */
  proba_6m NUMERIC(4,3) CHECK (proba_6m IS NULL OR (proba_6m >= 0 AND proba_6m <= 1)),

  /** Version de l'algo (pour invalidation cache si on change la formule). */
  algo_version TEXT NOT NULL DEFAULT 'v1.0',

  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_score_vente_segment ON brh_score_vente_v1(segment) WHERE segment IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_score_vente_score_desc ON brh_score_vente_v1(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS brh_score_vente_computed ON brh_score_vente_v1(computed_at DESC);

COMMENT ON TABLE brh_score_vente_v1 IS
  'Phase 16.0.1 — cache scoring vente par prospect DPE F/G. '
  'Calculé via lib/dpe-engine/score-vente, recalculé en batch ou trigger. '
  'Modèle Hoguet "A" : leads scorés, pas de transaction.';

-- ----------------------------------------------------------------------------
-- 2. brh_optout_requests — demandes opt-out RGPD (Art. 21)
-- ----------------------------------------------------------------------------
-- Page publique /opt-out : un propriétaire saisit son adresse + email,
-- on enregistre la demande, on déclenche une routine de purge sous 30j.
-- AUCUNE authentification requise (le but : faciliter le retrait).
CREATE TABLE IF NOT EXISTS brh_optout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /** Adresse postale fournie (texte libre + CP + commune). */
  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  code_insee CHAR(5),

  /** Email pour confirmation et preuve. */
  email TEXT NOT NULL,

  /** Type de demande RGPD. */
  request_type TEXT NOT NULL DEFAULT 'opposition'
    CHECK (request_type IN ('opposition','suppression','rectification')),

  /** Notes libres du demandeur (pourquoi, quel scoring, etc.). */
  message TEXT,

  /** Suivi traitement. */
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','rejected')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processing_notes TEXT,

  /** ID du prospect matché (NULL si pas trouvé dans brh_dpe_prospects). */
  matched_prospect_id BIGINT REFERENCES brh_dpe_prospects(id) ON DELETE SET NULL,

  /** Preuve (RGPD) : IP + user-agent + timestamp. */
  source_ip INET,
  source_user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Deadline légale = created_at + 30 jours. */
  deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS brh_optout_status_deadline ON brh_optout_requests(status, deadline);
CREATE INDEX IF NOT EXISTS brh_optout_email ON brh_optout_requests(email);

COMMENT ON TABLE brh_optout_requests IS
  'Phase 16.0.1 — Demandes opt-out RGPD Art. 21 (opposition/suppression). '
  'Saisie publique sans auth. Deadline légale 30j. Routine de purge à brancher.';

-- ----------------------------------------------------------------------------
-- 3. brh_lead_assignments — exclusivité lead → agence (anti-doublon)
-- ----------------------------------------------------------------------------
-- Quand une agence "claim" un lead, elle a 30 jours d'exclusivité pour le contacter.
-- Pas de claim renouvelé pour la même agence si pas de retour.
-- Si l'agence ne déclare pas un contact dans les 30j → lead repart en pool.
CREATE TABLE IF NOT EXISTS brh_lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  prospect_id BIGINT NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,

  /** Status du claim. */
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','contacted','expired','released','blacklisted')),

  /** Combien de tentatives l'agence a déclaré (frequency cap = 2 max). */
  contact_attempts INTEGER NOT NULL DEFAULT 0 CHECK (contact_attempts >= 0),

  /** Date de dernière tentative (auto-libération si > 30j). */
  last_attempt_at TIMESTAMPTZ,
  last_attempt_outcome TEXT
    CHECK (last_attempt_outcome IS NULL OR last_attempt_outcome IN
      ('no_answer','no_contact_info','interested','refused','already_sold','wrong_address')),

  /** Notes terrain agence. */
  notes TEXT,

  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Auto-expire après 30 jours (cron release_expired_assignments). */
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  released_at TIMESTAMPTZ
);

-- Un même prospect ne peut être claim qu'une seule fois en status 'active' à la fois
CREATE UNIQUE INDEX IF NOT EXISTS brh_lead_assignments_unique_active
  ON brh_lead_assignments(prospect_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS brh_lead_assignments_agence ON brh_lead_assignments(agence_id, status);
CREATE INDEX IF NOT EXISTS brh_lead_assignments_expires
  ON brh_lead_assignments(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS brh_lead_assignments_prospect ON brh_lead_assignments(prospect_id);

COMMENT ON TABLE brh_lead_assignments IS
  'Phase 16.0.1 — exclusivité lead 30j à 1 agence. Anti-doublon harassment. '
  'Cron mensuel release auto les expires_at < now(). Frequency cap 2 tentatives max.';

-- ----------------------------------------------------------------------------
-- 4. brh_partner_contracts — chartes partenaires signées (preuve eIDAS)
-- ----------------------------------------------------------------------------
-- Stockage des chartes signées électroniquement (signature simple : case +
-- horodatage + IP + email confirmation). Génération template par RAG juridique
-- (validé une fois par avocat).
CREATE TABLE IF NOT EXISTS brh_partner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /** Type de partenaire. */
  partner_type TEXT NOT NULL
    CHECK (partner_type IN ('agence_immo','artisan_rge','pro_company')),

  /** Référence vers la table partenaire. */
  agence_id UUID REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,
  company_id UUID REFERENCES brh_companies(id) ON DELETE CASCADE,

  /** Profil signataire (peut être différent du créateur si délégation). */
  signer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signer_full_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT, -- "Gérant", "Directeur commercial", etc.

  /** Version du template (versionning si charte évolue). */
  template_version TEXT NOT NULL DEFAULT 'v1.0',
  /** Contenu du contrat au moment de la signature (snapshot Markdown ou HTML). */
  contract_content TEXT NOT NULL,

  /** Signature simple eIDAS : case + IP + horodatage + confirmation email. */
  consent_terms BOOLEAN NOT NULL DEFAULT FALSE,
  consent_data BOOLEAN NOT NULL DEFAULT FALSE,
  consent_communications BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_ip INET,
  signature_user_agent TEXT,
  /** Token de confirmation par email (signature à 2 facteurs). */
  email_confirmation_token TEXT,
  email_confirmed_at TIMESTAMPTZ,

  /** Cycle de vie. */
  status TEXT NOT NULL DEFAULT 'pending_email'
    CHECK (status IN ('pending_email','active','revoked','expired')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  /** Au moins une référence partenaire doit être renseignée. */
  CONSTRAINT one_partner_ref CHECK (
    (agence_id IS NOT NULL)::INT +
    (artisan_id IS NOT NULL)::INT +
    (company_id IS NOT NULL)::INT = 1
  )
);

CREATE INDEX IF NOT EXISTS brh_partner_contracts_agence ON brh_partner_contracts(agence_id) WHERE agence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_partner_contracts_artisan ON brh_partner_contracts(artisan_id) WHERE artisan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_partner_contracts_company ON brh_partner_contracts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_partner_contracts_status ON brh_partner_contracts(status);

COMMENT ON TABLE brh_partner_contracts IS
  'Phase 16.0.1 — chartes partenaires signées. Signature simple eIDAS '
  '(case + horodatage + IP + email 2FA). Snapshot du contenu au signing.';

-- ----------------------------------------------------------------------------
-- 5. RLS — toutes les nouvelles tables
-- ----------------------------------------------------------------------------

-- brh_score_vente_v1 : pros + admin lisent (pas de PII direct, juste un score)
ALTER TABLE brh_score_vente_v1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "score_vente_select_pro_admin" ON brh_score_vente_v1
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pro','admin'))
  );
CREATE POLICY "score_vente_admin_all" ON brh_score_vente_v1
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- brh_optout_requests : INSERT public (sans auth = anon role), SELECT/UPDATE admin uniquement
ALTER TABLE brh_optout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "optout_insert_anon" ON brh_optout_requests
  FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "optout_insert_authenticated" ON brh_optout_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "optout_admin_all" ON brh_optout_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- brh_lead_assignments : agence concernée + admin
-- Note : pour MVP, on utilise une jointure brh_agences_immo. La cible Phase 16.0.6
-- utilisera un nouveau UserRole='agence' ou un champ profile_to_agence.
ALTER TABLE brh_lead_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_assignments_select_pro_admin" ON brh_lead_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pro','admin'))
  );
CREATE POLICY "lead_assignments_admin_all" ON brh_lead_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- brh_partner_contracts : signataire voit le sien + admin voit tout
ALTER TABLE brh_partner_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_select_signer" ON brh_partner_contracts
  FOR SELECT TO authenticated
  USING (signer_profile_id = auth.uid());
CREATE POLICY "contracts_insert_self" ON brh_partner_contracts
  FOR INSERT TO authenticated
  WITH CHECK (signer_profile_id = auth.uid());
CREATE POLICY "contracts_admin_all" ON brh_partner_contracts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ----------------------------------------------------------------------------
-- 6. Helper SQL — release auto leads expirés
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_release_expired_assignments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.brh_lead_assignments
    SET status = 'expired',
        released_at = now()
    WHERE status = 'active'
      AND expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION brh_release_expired_assignments IS
  'Phase 16.0.1 — libère les leads dont l''exclusivité a expiré (>30j). '
  'À planifier en pg_cron daily.';

-- ----------------------------------------------------------------------------
-- 7. Triggers updated_at
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_score_vente_updated
  BEFORE UPDATE ON brh_score_vente_v1
  FOR EACH ROW EXECUTE FUNCTION brh_refonte_set_updated_at();

CREATE TRIGGER trg_partner_contracts_updated
  BEFORE UPDATE ON brh_partner_contracts
  FOR EACH ROW EXECUTE FUNCTION brh_refonte_set_updated_at();
