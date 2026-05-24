-- =============================================================================
-- 2026-05-24 — Phase B2 dette technique : suppression policy RLS dangereuse
-- =============================================================================
--
-- VULNÉRABILITÉ détectée par audit RLS du 2026-05-24 :
--   La policy `agence_audits_respond_anon` (Phase 16.0.9, migration
--   20260705100000_brh_phase16_subs_audit.sql) autorisait UPDATE anon avec
--   USING (true) AND WITH CHECK (true), SANS validation du response_token.
--
--   Conséquence : un attaquant anonyme pouvait UPDATE n'importe quelle ligne
--   de brh_agence_audits (corruption feedback, pollution stats, défacement
--   des audits envoyés aux agences). Pas de PII fuie mais intégrité compromise.
--
-- Analyse impact :
--   - Aucune route publique /audit/respond?token=xxx n'existe côté frontend.
--   - Aucun composant React n'utilise UPDATE brh_agence_audits depuis un client
--     anon (seule la page /admin/agence-audits l'utilise, en tant qu'admin).
--   - L'Edge Function `send-audit-email` génère et envoie l'email, mais aucun
--     code n'implémente la réception côté public.
--   → policy actuellement INUTILISÉE en production.
--
-- Action : DROP de la policy. La feature de réponse anon devra être
-- réimplémentée correctement via un RPC SECURITY DEFINER `brh_audit_respond
-- (p_token TEXT, p_feedback TEXT, p_feedback_message TEXT)` qui :
--   - Cherche la ligne par response_token
--   - Vérifie status valide ('envoye', 'rappel_1', 'rappel_2')
--   - UPDATE avec response_at=now(), status='repondu'
--   - GRANT EXECUTE à anon (la RLS reste fermée — protection par RPC)
-- =============================================================================

DROP POLICY IF EXISTS agence_audits_respond_anon ON public.brh_agence_audits;

COMMENT ON TABLE public.brh_agence_audits IS
  'Phase 16.0.9 — audits aléatoires mensuels (5 % leads contactés). '
  'Email propriétaire avec token, réponse libre ou notée 5 valeurs. '
  'NOTE 2026-05-24 : policy UPDATE anon supprimée (vulnérabilité — pas de '
  'validation token). À recréer en RPC SECURITY DEFINER quand la page '
  '/audit/respond sera livrée. Pour l''instant, lecture/écriture réservées '
  'admin via /admin/agence-audits.';
