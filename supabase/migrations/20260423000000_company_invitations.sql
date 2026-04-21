-- Migration: Table d'invitations multi-membres pour les entreprises pro
-- Date: 2026-04-23
-- Contexte: Jusqu'ici chaque pro creait sa propre company. Systeme multi-membres :
--           owner invite des collaborateurs par email -> ils rejoignent comme 'member'
--           (pas 'owner') et partagent l'acces aux prospects/commissions de la company.

CREATE TABLE brh_company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES brh_companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  member_role TEXT DEFAULT 'member' CHECK (member_role IN ('owner', 'member')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON brh_company_invitations(token);
CREATE INDEX idx_invitations_email ON brh_company_invitations(email);
CREATE INDEX idx_invitations_company ON brh_company_invitations(company_id);

-- RLS : seul l'owner voit/gere ses invitations, admin voit tout, les users invites
-- peuvent checker leur invitation via Edge Function publique (pas de SELECT RLS direct)
ALTER TABLE brh_company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner voit ses invitations" ON brh_company_invitations FOR SELECT
  USING (invited_by = auth.uid() OR public.is_admin());

CREATE POLICY "Owner cree invitations" ON brh_company_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND company_id IN (
      SELECT company_id FROM brh_company_members
      WHERE profile_id = auth.uid() AND member_role = 'owner'
    )
  );

CREATE POLICY "Owner annule ses invitations" ON brh_company_invitations FOR DELETE
  USING (invited_by = auth.uid() AND accepted_at IS NULL);

CREATE POLICY "Admin manage invitations" ON brh_company_invitations FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE brh_company_invitations IS 'Invitations en attente pour rejoindre une entreprise pro. Token envoye par email via Edge Function company-invite.';
