-- Migration Phase 13.6.7.3 — Cron mensuel auto-génération factures commissions
--
-- Le 1er de chaque mois à 02h00 UTC, agrège automatiquement les chantiers
-- completed du mois précédent et crée les factures commission.
-- Idempotent (helper SQL `brh_generate_commission_invoices` skip si existante).
--
-- Pré-requis : extension `pg_cron` activée sur Supabase
-- (default activée sur tous les projets Supabase Cloud).

-- ============================================================================
-- Active pg_cron + pg_net (pour notifications HTTP éventuelles Phase 13.6.7.3.1)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================================
-- Helper SQL : auto-génération mois précédent (wrapper pour cron)
-- Note : pg_cron exécute en tant que postgres role, donc pas d'auth.uid()
-- → bypass RLS et appelle directement le helper SECURITY DEFINER.
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_cron_generate_previous_month_commissions()
RETURNS TABLE(invoices_created INTEGER, total_commission_eur NUMERIC)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_year SMALLINT;
  v_month SMALLINT;
  v_prev_date DATE;
  v_count INTEGER := 0;
  v_total NUMERIC := 0;
  rec RECORD;
BEGIN
  -- Mois précédent (M-1)
  v_prev_date := (now() AT TIME ZONE 'UTC')::date - INTERVAL '1 month';
  v_year := EXTRACT(YEAR FROM v_prev_date)::SMALLINT;
  v_month := EXTRACT(MONTH FROM v_prev_date)::SMALLINT;

  -- Appelle le générateur idempotent (skip si déjà existante)
  FOR rec IN
    SELECT * FROM public.brh_generate_commission_invoices(v_year, v_month, 0.05)
  LOOP
    IF rec.is_new THEN
      v_count := v_count + 1;
      v_total := v_total + rec.commission_eur;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
END;
$$;

COMMENT ON FUNCTION brh_cron_generate_previous_month_commissions IS
  'Wrapper cron : génère les factures commission du mois précédent. Idempotent. Appelé par pg_cron job le 1er de chaque mois à 02h UTC.';

-- ============================================================================
-- Schedule pg_cron : 1er de chaque mois à 02h00 UTC
-- ============================================================================
-- Cron pattern : "0 2 1 * *" = à 02:00, le 1er du mois, chaque mois
-- On schedule l'appel à notre wrapper.
--
-- Note : `cron.schedule` est idempotent par job_name → un re-run de cette migration
-- replace silencieusement le précédent schedule (jobname unique).

-- Suppression d'éventuel job précédent (idempotence migration)
SELECT cron.unschedule('brh_monthly_commissions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'brh_monthly_commissions');

-- Schedule effectif
SELECT cron.schedule(
  'brh_monthly_commissions',
  '0 2 1 * *',
  $$ SELECT public.brh_cron_generate_previous_month_commissions(); $$
);

-- ============================================================================
-- Table brh_cron_runs : audit des exécutions cron (transparence ops)
-- ============================================================================
CREATE TABLE IF NOT EXISTS brh_cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  invoices_created INTEGER,
  total_commission_eur NUMERIC(12, 2),
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX brh_cron_runs_job ON brh_cron_runs(job_name, started_at DESC);
CREATE INDEX brh_cron_runs_status ON brh_cron_runs(status, started_at DESC);

-- RLS : admin only
ALTER TABLE brh_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_cron_runs" ON brh_cron_runs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================================
-- Helper amélioré : audit + auto-génération
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_cron_generate_with_audit()
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_run_id UUID;
  v_count INTEGER;
  v_total NUMERIC;
BEGIN
  -- Crée run d'audit
  INSERT INTO public.brh_cron_runs(job_name, status)
  VALUES ('brh_monthly_commissions', 'running')
  RETURNING id INTO v_run_id;

  BEGIN
    -- Exécute la génération
    SELECT invoices_created, total_commission_eur
    INTO v_count, v_total
    FROM public.brh_cron_generate_previous_month_commissions();

    -- Marque succès
    UPDATE public.brh_cron_runs
    SET
      finished_at = now(),
      status = 'success',
      invoices_created = v_count,
      total_commission_eur = v_total
    WHERE id = v_run_id;

  EXCEPTION WHEN OTHERS THEN
    UPDATE public.brh_cron_runs
    SET
      finished_at = now(),
      status = 'error',
      error_message = SQLERRM
    WHERE id = v_run_id;
    RAISE;
  END;

  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION brh_cron_generate_with_audit IS
  'Auto-génération mensuelle factures commission avec audit trail brh_cron_runs.';

-- Re-schedule le cron pour pointer vers la version avec audit
SELECT cron.unschedule('brh_monthly_commissions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'brh_monthly_commissions');

SELECT cron.schedule(
  'brh_monthly_commissions',
  '0 2 1 * *',
  $$ SELECT public.brh_cron_generate_with_audit(); $$
);

COMMENT ON TABLE brh_cron_runs IS
  'Audit trail des exécutions cron BRH (Phase 13.6.7.3). Admin-only RLS, garde 12 mois (à purger via cron Phase 14+).';
