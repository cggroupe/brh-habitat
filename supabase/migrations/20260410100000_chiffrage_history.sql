-- Migration: Historique des chiffrages generes
-- Date: 2026-04-10

CREATE TABLE brh_chiffrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES brh_companies(id) ON DELETE SET NULL,
  reference TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_phone TEXT,
  projet_titre TEXT NOT NULL,
  projet_description TEXT,
  lignes JSONB NOT NULL DEFAULT '[]',
  total_ht INTEGER NOT NULL DEFAULT 0,
  tva_rate INTEGER NOT NULL DEFAULT 10,
  total_tva INTEGER NOT NULL DEFAULT 0,
  total_ttc INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brh_chiffrages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User voit ses chiffrages" ON brh_chiffrages FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "User cree chiffrage" ON brh_chiffrages FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage chiffrages" ON brh_chiffrages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_brh_chiffrages_user ON brh_chiffrages(user_id);
CREATE INDEX idx_brh_chiffrages_company ON brh_chiffrages(company_id);
