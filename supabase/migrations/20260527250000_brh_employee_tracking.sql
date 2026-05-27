-- =============================================================================
-- 2026-05-27 (nuit +2) — Tracking activité employés (sessions + events)
-- =============================================================================
--
-- Objectif : permettre à l'admin de suivre l'activité de l'équipe sur l'app
--   - Qui est connecté maintenant (heartbeat 30s)
--   - Quelles pages ont été vues, quels boutons cliqués
--   - Stats d'activité par employé (jour / semaine / mois)
--
-- ⚠️ RGPD — tracking d'employés en environnement pro :
--   - Légal en France (cadre management RH) MAIS obligation d'INFORMER les
--     salariés (mention DUERP + politique interne + consultation CSE si > 11
--     salariés). À mettre en place côté gouvernance avant production live.
--   - Données minimisées : pas de keylogger, pas de screenshot, pas de
--     géolocalisation précise, pas de contenu de formulaires
--   - Rétention par défaut : 90 jours (purge automatique via cron-job)
--   - Tableau de bord visible aux admins uniquement (RLS strict)
--   - Chaque employé peut consulter SES PROPRES données (droit d'accès art.15)
--
-- Tables :
--   - brh_employee_sessions : 1 row par session navigateur (started_at, last_seen_at)
--   - brh_employee_events   : timeline des events (page_view, click, custom)
--
-- RPCs :
--   - brh_tracking_heartbeat(session_id, page_path) : touch session + INSERT event
--   - brh_tracking_record_event(...) : INSERT event simple
--   - brh_tracking_live_users() : qui est connecté (admin)
--   - brh_tracking_employee_stats(user_id, period) : agrégats par employé (admin ou self)
--
-- Idempotente.
-- =============================================================================

-- 1) Table sessions
CREATE TABLE IF NOT EXISTS public.brh_employee_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  user_agent TEXT,
  -- Pas d'IP brute par défaut (RGPD/minimisation). On garde juste le /24 ipv4 ou /48 ipv6.
  ip_prefix TEXT,
  -- Compteur events (info dénormalisée pour stats rapides)
  events_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS brh_employee_sessions_user_idx
  ON public.brh_employee_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS brh_employee_sessions_live_idx
  ON public.brh_employee_sessions (last_seen_at DESC)
  WHERE ended_at IS NULL;

COMMENT ON TABLE public.brh_employee_sessions IS
  '2026-05-27 — Tracking sessions employés. Rétention 90j (purge cron). RGPD : info salariés obligatoire avant prod.';

-- 2) Table events (page views + clicks + custom)
CREATE TABLE IF NOT EXISTS public.brh_employee_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.brh_employee_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,           -- 'login' | 'logout' | 'page_view' | 'click' | 'send_email' | 'claim_prospect' | 'unclaim_prospect' | 'contact_tel' | 'contact_email' | etc.
  page_path TEXT,                     -- URL relative au moment de l'event
  payload JSONB,                      -- contexte libre (template_slug, prospect_id, button_label…)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_employee_events_user_time_idx
  ON public.brh_employee_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_employee_events_session_idx
  ON public.brh_employee_events (session_id);
CREATE INDEX IF NOT EXISTS brh_employee_events_type_time_idx
  ON public.brh_employee_events (event_type, created_at DESC);

COMMENT ON TABLE public.brh_employee_events IS
  '2026-05-27 — Timeline events employés (page_view, click, send_email, claim_prospect…). Rétention 90j. Données minimisées (pas de contenu formulaire, pas de keystroke).';

-- 3) RLS — admin lit tout, employé lit SES propres données
ALTER TABLE public.brh_employee_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brh_employee_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracking_sessions_select_own_or_admin ON public.brh_employee_sessions;
CREATE POLICY tracking_sessions_select_own_or_admin ON public.brh_employee_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

DROP POLICY IF EXISTS tracking_events_select_own_or_admin ON public.brh_employee_events;
CREATE POLICY tracking_events_select_own_or_admin ON public.brh_employee_events
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

-- Pas de policy INSERT/UPDATE directe : tout passe par les RPC SECURITY DEFINER.

-- 4) RPC heartbeat (appelé toutes les 30s par le frontend pour "online status")
DROP FUNCTION IF EXISTS public.brh_tracking_heartbeat(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.brh_tracking_heartbeat(
  p_session_id UUID DEFAULT NULL,        -- NULL → crée une nouvelle session
  p_page_path TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_prefix TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF p_session_id IS NULL THEN
    -- Nouvelle session
    INSERT INTO public.brh_employee_sessions (user_id, user_agent, ip_prefix)
    VALUES (v_user_id, p_user_agent, p_ip_prefix)
    RETURNING id INTO v_session_id;
  ELSE
    -- Refresh existing (et bind si l'user_id matche)
    UPDATE public.brh_employee_sessions
    SET last_seen_at = now()
    WHERE id = p_session_id AND user_id = v_user_id AND ended_at IS NULL
    RETURNING id INTO v_session_id;

    IF v_session_id IS NULL THEN
      -- session inconnue/expirée → nouvelle session
      INSERT INTO public.brh_employee_sessions (user_id, user_agent, ip_prefix)
      VALUES (v_user_id, p_user_agent, p_ip_prefix)
      RETURNING id INTO v_session_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_heartbeat(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 5) RPC enregistrer un event (batch jsonb)
DROP FUNCTION IF EXISTS public.brh_tracking_record_event(UUID, TEXT, TEXT, jsonb);

CREATE OR REPLACE FUNCTION public.brh_tracking_record_event(
  p_session_id UUID,
  p_event_type TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id BIGINT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_event_type IS NULL OR length(p_event_type) = 0 THEN
    RAISE EXCEPTION 'event_type required';
  END IF;
  IF length(p_event_type) > 64 THEN
    RAISE EXCEPTION 'event_type too long (max 64)';
  END IF;

  INSERT INTO public.brh_employee_events (user_id, session_id, event_type, page_path, payload)
  VALUES (v_user_id, p_session_id, p_event_type, p_page_path, p_payload)
  RETURNING id INTO v_id;

  -- Touch session counter (best-effort, ignore si session NULL/inconnue)
  IF p_session_id IS NOT NULL THEN
    UPDATE public.brh_employee_sessions
    SET events_count = events_count + 1, last_seen_at = now()
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_record_event(UUID, TEXT, TEXT, jsonb) TO authenticated;

-- 6) RPC qui est live (admin only) — last_seen_at < 2 min = online
DROP FUNCTION IF EXISTS public.brh_tracking_live_users();

CREATE OR REPLACE FUNCTION public.brh_tracking_live_users()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  session_id UUID,
  started_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  events_count INTEGER,
  current_page_path TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden : admin only';
  END IF;

  RETURN QUERY
  SELECT
    s.user_id,
    p.full_name,
    p.email,
    p.role,
    s.id AS session_id,
    s.started_at,
    s.last_seen_at,
    s.events_count,
    (
      SELECT e.page_path FROM public.brh_employee_events e
      WHERE e.session_id = s.id AND e.page_path IS NOT NULL
      ORDER BY e.created_at DESC LIMIT 1
    ) AS current_page_path
  FROM public.brh_employee_sessions s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.ended_at IS NULL
    AND s.last_seen_at > (now() - INTERVAL '2 minutes')
  ORDER BY s.last_seen_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_live_users() TO authenticated;

-- 7) RPC stats par employé (admin OU self)
DROP FUNCTION IF EXISTS public.brh_tracking_employee_stats(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.brh_tracking_employee_stats(
  p_user_id UUID DEFAULT NULL,         -- NULL → moi
  p_period TEXT DEFAULT '7d'            -- '24h' | '7d' | '30d' | '90d'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_target_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_is_admin BOOLEAN;
  v_since TIMESTAMPTZ;
  v_total_events BIGINT;
  v_total_sessions BIGINT;
  v_total_duration_minutes BIGINT;
  v_by_event_type jsonb;
  v_by_day jsonb;
  v_last_seen TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();

  -- Autorisation : soit l'admin demande pour quelqu'un, soit on demande pour soi
  IF v_target_user_id != auth.uid() AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden : admin only or self';
  END IF;

  v_since := CASE p_period
    WHEN '24h' THEN now() - INTERVAL '24 hours'
    WHEN '7d'  THEN now() - INTERVAL '7 days'
    WHEN '30d' THEN now() - INTERVAL '30 days'
    WHEN '90d' THEN now() - INTERVAL '90 days'
    ELSE now() - INTERVAL '7 days'
  END;

  SELECT COUNT(*) INTO v_total_events
  FROM public.brh_employee_events
  WHERE user_id = v_target_user_id AND created_at >= v_since;

  SELECT COUNT(*) INTO v_total_sessions
  FROM public.brh_employee_sessions
  WHERE user_id = v_target_user_id AND started_at >= v_since;

  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_seen_at) - started_at)) / 60), 0)::bigint
  INTO v_total_duration_minutes
  FROM public.brh_employee_sessions
  WHERE user_id = v_target_user_id AND started_at >= v_since;

  SELECT MAX(last_seen_at) INTO v_last_seen
  FROM public.brh_employee_sessions
  WHERE user_id = v_target_user_id;

  SELECT jsonb_object_agg(event_type, n) INTO v_by_event_type FROM (
    SELECT event_type, COUNT(*) AS n
    FROM public.brh_employee_events
    WHERE user_id = v_target_user_id AND created_at >= v_since
    GROUP BY event_type
    ORDER BY COUNT(*) DESC
  ) x;

  SELECT jsonb_object_agg(d::date::text, n ORDER BY d) INTO v_by_day FROM (
    SELECT date_trunc('day', created_at) AS d, COUNT(*) AS n
    FROM public.brh_employee_events
    WHERE user_id = v_target_user_id AND created_at >= v_since
    GROUP BY 1
    ORDER BY 1
  ) x;

  RETURN jsonb_build_object(
    'user_id', v_target_user_id,
    'period', p_period,
    'since', v_since,
    'total_events', v_total_events,
    'total_sessions', v_total_sessions,
    'total_duration_minutes', v_total_duration_minutes,
    'last_seen_at', v_last_seen,
    'by_event_type', COALESCE(v_by_event_type, '{}'::jsonb),
    'by_day', COALESCE(v_by_day, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_employee_stats(UUID, TEXT) TO authenticated;

-- 8) RPC timeline events récents (admin OU self)
DROP FUNCTION IF EXISTS public.brh_tracking_recent_events(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.brh_tracking_recent_events(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  user_full_name TEXT,
  session_id UUID,
  event_type TEXT,
  page_path TEXT,
  payload jsonb,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_target UUID := COALESCE(p_user_id, auth.uid());
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF v_target != auth.uid() AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden : admin only or self';
  END IF;

  RETURN QUERY
  SELECT
    e.id, e.user_id, p.full_name, e.session_id, e.event_type, e.page_path, e.payload, e.created_at
  FROM public.brh_employee_events e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.user_id = v_target
  ORDER BY e.created_at DESC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_recent_events(UUID, INTEGER) TO authenticated;

-- 9) RPC leaderboard équipe (admin only)
DROP FUNCTION IF EXISTS public.brh_tracking_team_leaderboard(TEXT);

CREATE OR REPLACE FUNCTION public.brh_tracking_team_leaderboard(p_period TEXT DEFAULT '7d')
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  total_events BIGINT,
  total_sessions BIGINT,
  total_duration_minutes BIGINT,
  last_seen_at TIMESTAMPTZ,
  events_login BIGINT,
  events_click BIGINT,
  events_page_view BIGINT,
  events_send_email BIGINT,
  events_claim_prospect BIGINT,
  events_contact_tel BIGINT,
  events_contact_email BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden : admin only';
  END IF;

  v_since := CASE p_period
    WHEN '24h' THEN now() - INTERVAL '24 hours'
    WHEN '7d'  THEN now() - INTERVAL '7 days'
    WHEN '30d' THEN now() - INTERVAL '30 days'
    WHEN '90d' THEN now() - INTERVAL '90 days'
    ELSE now() - INTERVAL '7 days'
  END;

  RETURN QUERY
  WITH ev AS (
    SELECT e.user_id, e.event_type
    FROM public.brh_employee_events e
    WHERE e.created_at >= v_since
  ),
  sess AS (
    SELECT s.user_id,
           COUNT(*) AS n_sessions,
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_seen_at) - s.started_at)) / 60), 0)::bigint AS duration_min,
           MAX(s.last_seen_at) AS last_seen
    FROM public.brh_employee_sessions s
    WHERE s.started_at >= v_since
    GROUP BY s.user_id
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.role,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id) AS total_events,
    COALESCE(sess.n_sessions, 0) AS total_sessions,
    COALESCE(sess.duration_min, 0) AS total_duration_minutes,
    sess.last_seen AS last_seen_at,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'login') AS events_login,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'click') AS events_click,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'page_view') AS events_page_view,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'send_email') AS events_send_email,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'claim_prospect') AS events_claim_prospect,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'contact_tel') AS events_contact_tel,
    (SELECT COUNT(*) FROM ev WHERE ev.user_id = p.id AND ev.event_type = 'contact_email') AS events_contact_email
  FROM public.profiles p
  WHERE p.role IN ('employe', 'admin')
  ORDER BY total_events DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_tracking_team_leaderboard(TEXT) TO authenticated;

-- 10) Cron purge auto > 90j (à brancher sur pg_cron côté admin si dispo, sinon manuel)
COMMENT ON SCHEMA public IS '2026-05-27 — tracking employés : à brancher purge > 90 jours via pg_cron : SELECT cron.schedule(''brh_tracking_purge'', ''0 3 * * *'', $$ DELETE FROM public.brh_employee_events WHERE created_at < now() - INTERVAL ''90 days''; DELETE FROM public.brh_employee_sessions WHERE last_seen_at < now() - INTERVAL ''90 days''; $$);';
