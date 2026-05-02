-- Migration Phase 13 — Killer Feature : Générateur IA de courrier de prospection
-- ADR : Différenciation BRH vs Kelvin° / CapRénov+ — du lead à la signature en 1 clic.

CREATE TABLE brh_prospect_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien prospect + pro (auteur)
  prospect_id BIGINT NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contenu généré (stocké pour audit + ré-édition)
  subject TEXT NOT NULL,
  body_md TEXT NOT NULL,           -- Markdown (édité dans le modal)
  greeting TEXT,                    -- ex: "Madame, Monsieur,"
  signature TEXT,                   -- ex: "Cordialement, Jean Dupont, RGE QB-12345"

  -- Métadonnées scoring v2 utilisées (snapshot pour audit)
  score_v2_at_generation SMALLINT,
  segment_at_generation TEXT,
  signaux_used JSONB,               -- ex: { dvf_mutation_24m: true, mpr_couleur: 'bleu', dpe_etiquette: 'F' }

  -- État
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'edited', 'sent', 'archived')),
  sent_via TEXT CHECK (sent_via IN ('email', 'pdf_print', 'postal')),
  sent_at TIMESTAMPTZ,

  -- IA tracking (cost monitoring)
  model_used TEXT NOT NULL DEFAULT 'claude-opus-4-7',
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  cache_creation_tokens INTEGER,
  generation_duration_ms INTEGER,

  -- Méta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_prospect_letters_prospect ON brh_prospect_letters(prospect_id);
CREATE INDEX brh_prospect_letters_pro ON brh_prospect_letters(generated_by);
CREATE INDEX brh_prospect_letters_status ON brh_prospect_letters(status);
CREATE INDEX brh_prospect_letters_created ON brh_prospect_letters(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION brh_prospect_letters_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brh_prospect_letters_updated_at
  BEFORE UPDATE ON brh_prospect_letters
  FOR EACH ROW
  EXECUTE FUNCTION brh_prospect_letters_set_updated_at();

-- RLS
ALTER TABLE brh_prospect_letters ENABLE ROW LEVEL SECURITY;

-- Pro voit ses propres courriers
CREATE POLICY "pro_select_own_letters" ON brh_prospect_letters FOR SELECT
  TO authenticated
  USING (
    generated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Pro insère ses propres courriers (vérif via generated_by = auth.uid())
CREATE POLICY "pro_insert_own_letters" ON brh_prospect_letters FOR INSERT
  TO authenticated
  WITH CHECK (
    generated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('pro', 'admin')
    )
  );

-- Pro update ses propres courriers (édition Markdown)
CREATE POLICY "pro_update_own_letters" ON brh_prospect_letters FOR UPDATE
  TO authenticated
  USING (
    generated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Pro archive (DELETE = archive en réalité, donc on autorise DELETE pour son propre courrier)
CREATE POLICY "pro_delete_own_letters" ON brh_prospect_letters FOR DELETE
  TO authenticated
  USING (generated_by = auth.uid());

COMMENT ON TABLE brh_prospect_letters IS
  'Courriers de prospection générés par IA Claude — Phase 13 killer feature BRH vs Kelvin°. Audit complet (modèle + tokens + signaux scoring v2) pour traçabilité commerciale et cost monitoring.';
