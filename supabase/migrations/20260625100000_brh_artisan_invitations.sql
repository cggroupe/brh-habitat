-- Migration Phase 13.6.5 — Magic link onboarding artisan (sans password)
--
-- Workflow :
--   1. Admin BRH (ou cron Phase 13.6.6) crée une invitation pour un artisan via EF
--   2. EF génère un token aléatoire 64 chars + envoie email Resend à l'artisan
--   3. Artisan clique le lien → page /artisan/onboarding/:token
--   4. EF verify retourne artisan info → user saisit son email + valide
--   5. EF accept crée user Supabase Auth + magic link OTP + lie profile_id à artisan
--   6. Status invitation : pending → sent → accepted (ou expired après 30j)
--
-- Pattern aligné avec brh_company_invitations (Phase 6).

CREATE TABLE brh_artisan_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien artisan (1 invitation par artisan, on peut en regénérer si expired)
  artisan_id UUID NOT NULL REFERENCES brh_artisans_rge(id) ON DELETE CASCADE,

  -- Token public (envoyé dans l'URL d'email, 64 chars hex)
  token TEXT UNIQUE NOT NULL,

  -- Email cible (peut différer de artisan.email si admin override)
  email_to TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'revoked')),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Métadonnées
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- admin qui a créé
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  message_personnel TEXT,                                       -- mot du créateur

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_artisan_inv_token ON brh_artisan_invitations(token) WHERE status IN ('pending', 'sent');
CREATE INDEX brh_artisan_inv_artisan ON brh_artisan_invitations(artisan_id, status);
CREATE INDEX brh_artisan_inv_status ON brh_artisan_invitations(status, expires_at);

-- Trigger updated_at
CREATE TRIGGER brh_artisan_inv_updated_at
  BEFORE UPDATE ON brh_artisan_invitations
  FOR EACH ROW
  EXECUTE FUNCTION brh_artisans_set_updated_at();

-- ============================================================================
-- Helper SQL : génère un token aléatoire 64 chars hex
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_gen_artisan_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- 32 bytes random → 64 chars hex
  v_token := encode(gen_random_bytes(32), 'hex');
  RETURN v_token;
END;
$$;

-- ============================================================================
-- Helper SQL : verify + accept (atomique)
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_artisan_invite_accept(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, artisan_id UUID, message TEXT)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_inv RECORD;
  v_existing_link UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Auth requise'::TEXT;
    RETURN;
  END IF;

  -- Charge l'invitation + verrou
  SELECT * INTO v_inv FROM public.brh_artisan_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF v_inv IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Token invalide'::TEXT;
    RETURN;
  END IF;

  IF v_inv.status NOT IN ('pending', 'sent') THEN
    RETURN QUERY SELECT false, NULL::UUID, format('Invitation %s', v_inv.status);
    RETURN;
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.brh_artisan_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN QUERY SELECT false, NULL::UUID, 'Invitation expirée'::TEXT;
    RETURN;
  END IF;

  -- Vérifie que l'artisan n'est pas déjà lié à un autre user
  SELECT profile_id INTO v_existing_link FROM public.brh_artisans_rge WHERE id = v_inv.artisan_id;
  IF v_existing_link IS NOT NULL AND v_existing_link <> p_user_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Artisan déjà lié à un autre compte'::TEXT;
    RETURN;
  END IF;

  -- Lie le user à l'artisan
  UPDATE public.brh_artisans_rge SET profile_id = p_user_id WHERE id = v_inv.artisan_id;

  -- Marque l'invitation acceptée
  UPDATE public.brh_artisan_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_inv.id;

  RETURN QUERY SELECT true, v_inv.artisan_id, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION brh_artisan_invite_accept IS
  'Accepte une invitation magic link. Vérifie token + expiry + ownership unique. Lie profile_id à artisan en 1 transaction atomique.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE brh_artisan_invitations ENABLE ROW LEVEL SECURITY;

-- Admin BRH peut tout faire
CREATE POLICY "admin_all_artisan_invitations" ON brh_artisan_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- L'artisan invité peut SELECT son invitation (pour voir status sur dashboard onboarding)
CREATE POLICY "invited_artisan_select" ON brh_artisan_invitations FOR SELECT
  TO authenticated
  USING (accepted_by = auth.uid());

-- Le verify côté EF utilise service_role (bypass RLS) — pas besoin de policy pour anon

COMMENT ON TABLE brh_artisan_invitations IS
  'Invitations magic link pour onboarding artisan sans password — Phase 13.6.5. Token 64 chars hex, expiry 30j, lien atomique profile_id ↔ artisan via brh_artisan_invite_accept.';
