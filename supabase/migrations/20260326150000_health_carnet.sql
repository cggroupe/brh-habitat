-- =============================================================================
-- 005 — Carnet de Sante de la Maison (2026-03-26)
-- Nouvelles tables : health_records, work_history, home_documents
-- Extension brh_homes avec health_score
-- =============================================================================

-- =============================================================================
-- EXTENSION brh_homes
-- =============================================================================
ALTER TABLE brh_homes ADD COLUMN IF NOT EXISTS health_score INT;

-- =============================================================================
-- HEALTH RECORDS (Etat de sante par domaine)
-- =============================================================================
CREATE TABLE brh_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES brh_homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('humidite','isolation','ventilation','menuiseries','electricite','toiture','plomberie')),
  score INT CHECK (score BETWEEN 0 AND 100),
  urgency TEXT CHECK (urgency IN ('faible','modere','eleve','critique')),
  symptoms TEXT[] DEFAULT '{}',
  notes TEXT,
  assessed_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Un seul record par domaine par logement
CREATE UNIQUE INDEX idx_health_records_home_domain ON brh_health_records(home_id, domain);
CREATE INDEX idx_health_records_user ON brh_health_records(user_id);

ALTER TABLE brh_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health records" ON brh_health_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all health records" ON brh_health_records
  FOR ALL USING (public.is_admin());

CREATE TRIGGER brh_health_records_updated_at BEFORE UPDATE ON brh_health_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- WORK HISTORY (Historique et travaux planifies)
-- =============================================================================
CREATE TABLE brh_work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES brh_homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('humidite','isolation','ventilation','menuiseries','electricite','toiture','plomberie','autre')),
  title TEXT NOT NULL,
  description TEXT,
  contractor TEXT,
  cost NUMERIC,
  status TEXT DEFAULT 'planifie' CHECK (status IN ('planifie','en_cours','termine')),
  work_date DATE,
  completed_at DATE,
  documents TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_work_history_home ON brh_work_history(home_id);
CREATE INDEX idx_work_history_status ON brh_work_history(status);
CREATE INDEX idx_work_history_user ON brh_work_history(user_id);

ALTER TABLE brh_work_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own work history" ON brh_work_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all work history" ON brh_work_history
  FOR ALL USING (public.is_admin());

CREATE TRIGGER brh_work_history_updated_at BEFORE UPDATE ON brh_work_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- HOME DOCUMENTS (Diagnostics obligatoires)
-- =============================================================================
CREATE TABLE brh_home_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES brh_homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('dpe','amiante','plomb','electricite','gaz','erp','termites','assainissement','autre')),
  title TEXT NOT NULL,
  file_url TEXT,
  issued_at DATE,
  expires_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_home_documents_home ON brh_home_documents(home_id);
CREATE INDEX idx_home_documents_expires ON brh_home_documents(expires_at);
CREATE INDEX idx_home_documents_user ON brh_home_documents(user_id);

ALTER TABLE brh_home_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own home documents" ON brh_home_documents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all home documents" ON brh_home_documents
  FOR ALL USING (public.is_admin());

CREATE TRIGGER brh_home_documents_updated_at BEFORE UPDATE ON brh_home_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
