-- Migration Phase 13.6.7 — Tracking commissions BRH
--
-- Workflow :
--   1. Chaque chantier `completed` génère une commission due (5-10% du montant signé)
--   2. Mensuellement, BRH agrège les chantiers completed du mois pour chaque artisan
--   3. Une `brh_commission_invoices` est créée (1 par artisan/mois) avec total + leads liés
--   4. Status pending → invoiced → paid → reconciled
--   5. Stripe Connect Phase 13.6.7.1+ : auto-prélèvement par mandat SEPA/carte

-- ============================================================================
-- brh_commission_invoices — facture mensuelle par artisan (agrège leads completed)
-- ============================================================================
CREATE TABLE brh_commission_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien artisan
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,

  -- Période (mois calendaire)
  period_year SMALLINT NOT NULL,
  period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  -- Agrégation
  nb_leads_completed INTEGER NOT NULL DEFAULT 0,
  total_chantiers_ttc_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5, 4) NOT NULL DEFAULT 0.05,    -- 5% par défaut
  total_commission_due_eur NUMERIC(10, 2) NOT NULL,

  -- Statut workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- agrégée, pas encore facturée
    'invoiced',    -- facture émise (Stripe Invoice ou PDF manuel)
    'paid',        -- payée par l'artisan
    'reconciled',  -- rapprochée comptablement
    'canceled',    -- annulée (litige, geste commercial)
    'disputed'     -- l'artisan conteste un montant
  )),

  -- Stripe (Phase 13.6.7.1+)
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reconciled_at TIMESTAMPTZ,

  -- Notes admin
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1 facture par artisan/mois (pas de double facturation)
  UNIQUE(artisan_id, period_year, period_month)
);

CREATE INDEX brh_commission_artisan ON brh_commission_invoices(artisan_id, period_year DESC, period_month DESC);
CREATE INDEX brh_commission_status ON brh_commission_invoices(status, created_at DESC);
CREATE INDEX brh_commission_period ON brh_commission_invoices(period_year DESC, period_month DESC);

-- ============================================================================
-- brh_commission_lead_links — leads inclus dans chaque facture (audit trail)
-- ============================================================================
CREATE TABLE brh_commission_lead_links (
  invoice_id UUID NOT NULL REFERENCES brh_commission_invoices(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES brh_artisan_leads(id) ON DELETE CASCADE,
  chantier_ttc_eur NUMERIC(10, 2) NOT NULL,
  commission_eur NUMERIC(10, 2) NOT NULL,
  PRIMARY KEY (invoice_id, lead_id)
);

CREATE INDEX brh_commission_lead_links_lead ON brh_commission_lead_links(lead_id);

-- ============================================================================
-- Trigger updated_at
-- ============================================================================
CREATE TRIGGER brh_commission_invoices_updated_at
  BEFORE UPDATE ON brh_commission_invoices
  FOR EACH ROW
  EXECUTE FUNCTION brh_artisans_set_updated_at();

-- ============================================================================
-- Helper SQL : calcule + génère les factures pour un mois donné (admin)
-- Idempotent : si la facture existe déjà, ne fait rien (re-runable safe)
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_generate_commission_invoices(
  p_year SMALLINT,
  p_month SMALLINT,
  p_default_pct NUMERIC DEFAULT 0.05
)
RETURNS TABLE(
  artisan_id UUID,
  invoice_id UUID,
  nb_leads INTEGER,
  total_eur NUMERIC,
  commission_eur NUMERIC,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  rec RECORD;
  v_invoice_id UUID;
  v_existing UUID;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Bornes du mois
  v_period_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0);
  v_period_end := v_period_start + INTERVAL '1 month';

  FOR rec IN
    SELECT
      l.artisan_id,
      COUNT(*) AS nb_leads,
      COALESCE(SUM(l.actual_chantier_ttc_eur), 0) AS total_eur
    FROM public.brh_artisan_leads l
    WHERE l.status = 'completed'
      AND l.completed_at >= v_period_start
      AND l.completed_at < v_period_end
      AND l.actual_chantier_ttc_eur IS NOT NULL
      AND l.actual_chantier_ttc_eur > 0
    GROUP BY l.artisan_id
  LOOP
    -- Vérifie si facture déjà existante
    SELECT id INTO v_existing
    FROM public.brh_commission_invoices
    WHERE brh_commission_invoices.artisan_id = rec.artisan_id
      AND period_year = p_year
      AND period_month = p_month;

    IF v_existing IS NOT NULL THEN
      -- Déjà facturée, on retourne ligne info
      RETURN QUERY SELECT rec.artisan_id, v_existing, rec.nb_leads::INTEGER, rec.total_eur, rec.total_eur * p_default_pct, false;
      CONTINUE;
    END IF;

    -- Crée la facture
    INSERT INTO public.brh_commission_invoices(
      artisan_id, period_year, period_month,
      nb_leads_completed, total_chantiers_ttc_eur,
      commission_pct, total_commission_due_eur,
      status
    ) VALUES (
      rec.artisan_id, p_year, p_month,
      rec.nb_leads, rec.total_eur,
      p_default_pct, rec.total_eur * p_default_pct,
      'pending'
    )
    RETURNING id INTO v_invoice_id;

    -- Lie chaque lead completed à la facture (audit trail)
    INSERT INTO public.brh_commission_lead_links(invoice_id, lead_id, chantier_ttc_eur, commission_eur)
    SELECT v_invoice_id, l.id, l.actual_chantier_ttc_eur, l.actual_chantier_ttc_eur * p_default_pct
    FROM public.brh_artisan_leads l
    WHERE l.artisan_id = rec.artisan_id
      AND l.status = 'completed'
      AND l.completed_at >= v_period_start
      AND l.completed_at < v_period_end
      AND l.actual_chantier_ttc_eur IS NOT NULL
      AND l.actual_chantier_ttc_eur > 0;

    -- Met à jour les leads pour set commission_paid_eur (sera updaté à 'paid' status)
    UPDATE public.brh_artisan_leads l
    SET expected_commission_eur = l.actual_chantier_ttc_eur * p_default_pct
    WHERE l.artisan_id = rec.artisan_id
      AND l.status = 'completed'
      AND l.completed_at >= v_period_start
      AND l.completed_at < v_period_end
      AND l.expected_commission_eur IS NULL;

    RETURN QUERY SELECT rec.artisan_id, v_invoice_id, rec.nb_leads::INTEGER, rec.total_eur, rec.total_eur * p_default_pct, true;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION brh_generate_commission_invoices IS
  'Agrège les leads completed d''un mois donné par artisan et génère les factures de commission. Idempotent (skip si déjà existante).';

-- ============================================================================
-- Helper SQL : marque facture payée + cascade vers leads associés
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_mark_commission_paid(
  p_invoice_id UUID,
  p_stripe_payment_intent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.brh_commission_invoices
  SET
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent_id = COALESCE(p_stripe_payment_intent, stripe_payment_intent_id)
  WHERE id = p_invoice_id;

  -- Cascade vers les leads liés
  UPDATE public.brh_artisan_leads l
  SET
    commission_paid_eur = ll.commission_eur,
    commission_paid_at = now()
  FROM public.brh_commission_lead_links ll
  WHERE ll.invoice_id = p_invoice_id
    AND l.id = ll.lead_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION brh_mark_commission_paid IS
  'Marque une facture commission BRH comme payée + cascade commission_paid_eur vers tous les leads liés.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE brh_commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_commission_lead_links ENABLE ROW LEVEL SECURITY;

-- Admin all
CREATE POLICY "admin_all_commission_invoices" ON brh_commission_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "admin_all_commission_links" ON brh_commission_lead_links FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Artisan voit ses propres factures (transparence)
CREATE POLICY "artisan_select_own_invoices" ON brh_commission_invoices FOR SELECT
  TO authenticated
  USING (
    artisan_id IN (SELECT id FROM brh_artisans_rge WHERE profile_id = auth.uid())
  );

CREATE POLICY "artisan_select_own_links" ON brh_commission_lead_links FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id FROM brh_commission_invoices i
      JOIN brh_artisans_rge a ON a.id = i.artisan_id
      WHERE a.profile_id = auth.uid()
    )
  );

COMMENT ON TABLE brh_commission_invoices IS
  'Factures mensuelles de commission BRH par artisan — Phase 13.6.7. Agrège tous les chantiers completed du mois. 1 facture par artisan/mois (UNIQUE constraint).';

COMMENT ON TABLE brh_commission_lead_links IS
  'Audit trail : lie chaque lead completed à la facture commission qui le contient.';
