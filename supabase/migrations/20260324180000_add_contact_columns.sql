-- =============================================================================
-- 003 — Ajouter colonnes contact/RDV manquantes + table contacts
-- =============================================================================

-- =============================================================================
-- APPOINTMENTS — Colonnes pour les RDV sans compte (ContactRdvModal)
-- =============================================================================

ALTER TABLE brh_appointments
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS preferred_slot TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_id UUID REFERENCES brh_diagnostics(id) ON DELETE SET NULL;

-- Index sur diagnostic_id pour les jointures admin
CREATE INDEX IF NOT EXISTS idx_brh_appointments_diagnostic ON brh_appointments(diagnostic_id);

-- Ajouter 'pending' comme status valide (utilise par ContactRdvModal)
-- Le CHECK constraint actuel est : status IN ('demande', 'confirme', 'annule', 'termine')
-- On le remplace pour accepter aussi 'pending' (equivalent de 'demande' pour les RDV web)
ALTER TABLE brh_appointments DROP CONSTRAINT IF EXISTS brh_appointments_status_check;
ALTER TABLE brh_appointments ADD CONSTRAINT brh_appointments_status_check
  CHECK (status IN ('demande', 'pending', 'confirme', 'annule', 'termine'));

-- Policy pour les RDV anonymes (sans user_id) : les admins peuvent tout voir
-- Les RDV avec user_id sont deja couverts par les policies existantes
-- Les RDV sans user_id (contact_email rempli) ne sont visibles que par les admins
CREATE POLICY "Admins can manage anonymous appointments" ON brh_appointments
  FOR ALL USING (
    user_id IS NULL AND public.is_admin()
  );

-- Policy pour permettre l'INSERT sans user_id (visiteur non connecte)
-- Le particulier peut creer un RDV meme sans compte
DROP POLICY IF EXISTS "Users can create appointments" ON brh_appointments;
CREATE POLICY "Anyone authenticated can create appointments" ON brh_appointments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- CONTACTS — Table pour les messages du formulaire /contact
-- =============================================================================

CREATE TABLE IF NOT EXISTS brh_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  sujet TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'lu', 'traite')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_contacts ENABLE ROW LEVEL SECURITY;

-- Tout le monde authentifie peut envoyer un message de contact
CREATE POLICY "Anyone can create contacts" ON brh_contacts
  FOR INSERT WITH CHECK (true);

-- Seuls les admins peuvent lire/modifier les messages
CREATE POLICY "Admins can manage contacts" ON brh_contacts
  FOR ALL USING (public.is_admin());

-- Trigger updated_at
CREATE TRIGGER brh_contacts_updated_at BEFORE UPDATE ON brh_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_brh_contacts_status ON brh_contacts(status);
