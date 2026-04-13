-- Migration: Fix critiques audit v4
-- Date: 2026-04-13

-- C3: brh_home_documents — ajouter policies si elles n'existent pas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brh_home_documents' AND policyname = 'Users can manage own home documents') THEN
    CREATE POLICY "Users can manage own home documents" ON brh_home_documents
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brh_home_documents' AND policyname = 'Admins can manage all home documents') THEN
    CREATE POLICY "Admins can manage all home documents" ON brh_home_documents
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
