-- =====================================================================
-- Migration : Ajout du support "brouillon" pour les diagnostics
-- Permet de reprendre un diagnostic en cours depuis le tableau de bord
-- =====================================================================

-- 1. Ajouter current_step pour savoir où l'utilisateur en est
ALTER TABLE brh_diagnostics
  ADD COLUMN IF NOT EXISTS current_step smallint NOT NULL DEFAULT 5;

-- 2. Modifier le type status pour inclure 'draft'
-- On doit d'abord supprimer la contrainte si elle existe, puis la recréer
DO $$
BEGIN
  -- Vérifier si une contrainte check existe sur status
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%status%'
    AND constraint_schema = 'public'
  ) THEN
    -- Pas de contrainte enum à modifier, status est un text libre
    NULL;
  END IF;
END $$;

-- 3. Ajouter equipment en JSONB pour persister les données d'équipement
ALTER TABLE brh_diagnostics
  ADD COLUMN IF NOT EXISTS equipment jsonb DEFAULT '{}'::jsonb;

-- 4. Index pour retrouver rapidement les brouillons d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_brh_diagnostics_user_draft
  ON brh_diagnostics (user_id, status)
  WHERE status = 'draft';

-- 5. RLS : l'utilisateur peut modifier ses propres brouillons
-- (la policy select existe déjà, on ajoute update pour les brouillons)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brh_diagnostics' AND policyname = 'diagnostics_update_own_draft'
  ) THEN
    CREATE POLICY diagnostics_update_own_draft ON brh_diagnostics
      FOR UPDATE
      USING (user_id = auth.uid() AND status = 'draft')
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
