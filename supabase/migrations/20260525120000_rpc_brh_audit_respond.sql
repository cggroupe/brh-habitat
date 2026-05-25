-- =============================================================================
-- 2026-05-25 — Phase 2.1 : RPC brh_audit_respond (SECURITY DEFINER + anon)
-- =============================================================================
--
-- CONTEXTE :
--   Le 24/05, la policy RLS `agence_audits_respond_anon` a été droppée
--   (migration 20260524110000) car elle autorisait `UPDATE TO anon
--   USING (true) WITH CHECK (true)` SANS validation du response_token.
--   Faille : un anonyme pouvait UPDATE n'importe quelle ligne d'audit.
--
--   Cette RPC restaure la feature proprement :
--   - SECURITY DEFINER + SET search_path = '' (règle anti-bug #12)
--   - Validation atomique du token (FOR UPDATE)
--   - Vérification que l'audit n'a pas déjà été répondu
--   - Validation enum feedback (5 valeurs)
--   - UPDATE feedback + feedback_message + response_at + status='responded'
--   - Pas de fuite de données : retourne TEXT générique seulement.
--
-- PATTERN : calqué sur `brh_artisan_invite_accept`
-- (migration 20260625100000_brh_artisan_invitations.sql:70-125).
--
-- USAGE : appelée par la page publique /audit/respond?token=xxx
-- (composant src/pages/public/AuditRespondPage.tsx — Phase 2.3).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_audit_respond(
  p_token TEXT,
  p_feedback TEXT,
  p_feedback_message TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit RECORD;
BEGIN
  -- Validation enum feedback (avant de toucher la DB)
  IF p_feedback IS NULL OR p_feedback NOT IN
     ('correct', 'intrusive', 'not_contacted', 'interested', 'complaint') THEN
    RETURN QUERY SELECT false, 'Choix de réponse invalide'::TEXT;
    RETURN;
  END IF;

  -- Validation longueur message (defense-in-depth, frontend valide aussi)
  IF p_feedback_message IS NOT NULL AND length(p_feedback_message) > 2000 THEN
    RETURN QUERY SELECT false, 'Message trop long (2000 caractères maximum)'::TEXT;
    RETURN;
  END IF;

  -- Charge l'audit + verrou atomique
  SELECT id, response_at, status
    INTO v_audit
    FROM public.brh_agence_audits
   WHERE response_token = p_token
   FOR UPDATE;

  IF v_audit IS NULL THEN
    RETURN QUERY SELECT false, 'Lien invalide ou expiré'::TEXT;
    RETURN;
  END IF;

  IF v_audit.response_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Vous avez déjà répondu à cet audit'::TEXT;
    RETURN;
  END IF;

  -- UPDATE en une seule passe
  UPDATE public.brh_agence_audits
     SET feedback = p_feedback,
         feedback_message = NULLIF(trim(coalesce(p_feedback_message, '')), ''),
         response_at = now(),
         status = 'responded'
   WHERE id = v_audit.id;

  RETURN QUERY SELECT true, 'Merci pour votre réponse'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.brh_audit_respond(TEXT, TEXT, TEXT) IS
  'Phase 2 (25/05) — Permet à un anon (lien dans email) de répondre à un audit avec validation stricte du token. Remplace la policy RLS UPDATE TO anon USING (true) droppée 24/05 pour vulnérabilité (cf migration 20260524110000).';

-- L'anon utilise cette RPC via le lien magic-link dans l'email d'audit.
-- authenticated également (pour debug en console).
GRANT EXECUTE ON FUNCTION public.brh_audit_respond(TEXT, TEXT, TEXT) TO anon, authenticated;
