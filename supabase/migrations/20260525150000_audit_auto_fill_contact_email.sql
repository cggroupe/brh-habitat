-- =============================================================================
-- 2026-05-25 — Phase 2.5 : auto-fill contact_email dans brh_generate_monthly_audits
-- =============================================================================
--
-- CONTEXTE :
--   La feature audit-respond anon (Phase 2) est livrée : RPC + page publique.
--   Mais l'EF monthly-audit-agencies ne pouvait pas envoyer les emails car
--   `contact_email` n'était jamais rempli (table brh_proprietaires inexistante).
--
--   Solution : auto-remplir contact_email lors de la génération via match
--   sur l'adresse BAN avec brh_personnes_historique (clients BRH connus).
--   Le chantier BAN (Phase 1, en cours en background) rend ce match efficace.
--
-- ALGORITHME :
--   À l'INSERT de chaque audit :
--   1. Récupère le prospect_id (déjà fait par helper existant)
--   2. Cherche dans brh_personnes_historique une personne :
--      - dont adresse_ban_id == prospect.adresse_ban_id (si non null)
--      - OU dont (code_postal, numero_norm, voie_norm) matche le prospect
--      - email non null
--   3. Stocke cet email dans contact_email
--
-- Idempotence : `ON CONFLICT DO NOTHING` du helper original conservé.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_generate_monthly_audits(p_audit_month DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_period_start TIMESTAMPTZ := date_trunc('month', p_audit_month);
  v_period_end TIMESTAMPTZ := v_period_start + interval '1 month';
BEGIN
  WITH sampled AS (
    SELECT la.id, la.agence_id, la.prospect_id
    FROM public.brh_lead_assignments la
    WHERE la.status = 'contacted'
      AND la.last_attempt_at >= v_period_start
      AND la.last_attempt_at < v_period_end
    ORDER BY random()
    LIMIT GREATEST(1, (
      SELECT count(*)::int * 5 / 100
      FROM public.brh_lead_assignments
      WHERE status = 'contacted'
        AND last_attempt_at >= v_period_start
        AND last_attempt_at < v_period_end
    ))
  ),
  -- Pour chaque sample, on tente de retrouver un email via les clients BRH
  -- (matching prioritaire BAN id, fallback cp+num+voie strict).
  with_email AS (
    SELECT
      s.id, s.agence_id, s.prospect_id,
      (
        SELECT p.email
        FROM public.brh_personnes_historique p
        JOIN public.brh_dpe_prospects d ON d.id = s.prospect_id
        WHERE p.email IS NOT NULL
          AND p.email != ''
          AND (
            (p.adresse_ban_id IS NOT NULL AND p.adresse_ban_id = d.adresse_ban_id)
            OR
            (p.code_postal = d.code_postal
             AND p.numero_norm = d.numero_norm
             AND p.voie_norm = d.voie_norm
             AND p.numero_norm IS NOT NULL
             AND p.voie_norm IS NOT NULL)
          )
        LIMIT 1
      ) AS contact_email
    FROM sampled s
  ),
  inserted AS (
    INSERT INTO public.brh_agence_audits
      (agence_id, assignment_id, prospect_id, audit_month, contact_email)
    SELECT agence_id, id, prospect_id, p_audit_month, contact_email
    FROM with_email
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.brh_generate_monthly_audits IS
  'Phase 16.0.9 + 2.5 (25/05) — génère 5% audits aléatoires + auto-fill contact_email via match BAN id ou cp+num+voie strict sur brh_personnes_historique. Idempotent. Invoqué par EF monthly-audit-agencies.';
