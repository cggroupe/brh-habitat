-- Migration: RPCs pour optimiser les N+1 (Bugs 5, 11, 12)
-- Date: 2026-04-03

-- ============================================================
-- Bug 11: Stats dashboard company — sous-requete au lieu de .in() illimite
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_company_commission_stats(p_company_id UUID)
RETURNS TABLE(dues BIGINT, versees BIGINT) AS $$
  SELECT
    COALESCE(SUM(CASE WHEN q.commission_status != 'versee' THEN q.commission_amount ELSE 0 END), 0) AS dues,
    COALESCE(SUM(CASE WHEN q.commission_status = 'versee' THEN q.commission_amount ELSE 0 END), 0) AS versees
  FROM public.brh_quotes q
  INNER JOIN public.brh_prospects p ON p.id = q.prospect_id
  WHERE p.company_id = p_company_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================
-- Bug 5: Threads avec dernier message + unread count en 1 requete
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_threads_enriched(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  subject TEXT,
  participant_id UUID,
  participant_type TEXT,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  created_at TIMESTAMPTZ,
  last_message TEXT,
  unread_count BIGINT
) AS $$
  SELECT
    t.id, t.subject, t.participant_id, t.participant_type,
    t.last_message_at, t.is_archived, t.created_at,
    (SELECT m.body FROM public.brh_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
    (SELECT COUNT(*) FROM public.brh_messages m WHERE m.thread_id = t.id AND m.is_read = false AND m.sender_id != p_user_id) AS unread_count
  FROM public.brh_message_threads t
  WHERE t.participant_id = p_user_id AND t.is_archived = false
  ORDER BY t.last_message_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================
-- Bug 12: Stats recrues en 1 requete agrege
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_recruit_stats(p_recruiter_id UUID)
RETURNS TABLE(
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  prospects_count BIGINT,
  signed_count BIGINT
) AS $$
  WITH recruited_ids AS (
    SELECT a.id AS pid FROM public.brh_affiliates a WHERE a.recruited_by = p_recruiter_id
    UNION
    SELECT c.owner_id AS pid FROM public.brh_companies c WHERE c.recruited_by = p_recruiter_id AND c.owner_id IS NOT NULL
  )
  SELECT
    pr.id AS profile_id,
    pr.full_name,
    pr.email,
    pr.role,
    pr.created_at,
    COALESCE(ps.total, 0) AS prospects_count,
    COALESCE(ps.signed, 0) AS signed_count
  FROM recruited_ids ri
  JOIN public.profiles pr ON pr.id = ri.pid
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.status IN ('signe', 'termine')) AS signed
    FROM public.brh_prospects p
    WHERE (p.affiliate_id = ri.pid OR p.company_id IN (SELECT cc.id FROM public.brh_companies cc WHERE cc.owner_id = ri.pid))
  ) ps ON true
  ORDER BY pr.created_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
