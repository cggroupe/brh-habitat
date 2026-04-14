-- ============================================================
-- Migration: Audit v6 fixes
-- Date: 2026-04-14
-- Fixes: C3 (brh_cases.estimated_budget), H2 (storage buckets)
-- ============================================================

-- -------------------------------------------------------
-- C3: Convertir brh_cases.estimated_budget NUMERIC -> INTEGER (cents)
-- -------------------------------------------------------
ALTER TABLE brh_cases
  ALTER COLUMN estimated_budget TYPE INTEGER
  USING CASE
    WHEN estimated_budget IS NOT NULL THEN round(estimated_budget * 100)::INTEGER
    ELSE NULL
  END;

COMMENT ON COLUMN brh_cases.estimated_budget IS 'Budget estime en centimes (INTEGER). Ex: 150000 = 1500.00 EUR';

-- -------------------------------------------------------
-- H2: Scoper les storage buckets par user/company
-- -------------------------------------------------------

-- prospect-files : restreindre SELECT/INSERT au dossier de la company
DROP POLICY IF EXISTS "prospect-files: auth users can read" ON storage.objects;
DROP POLICY IF EXISTS "prospect-files: auth users can upload" ON storage.objects;
DROP POLICY IF EXISTS "prospect_files_select" ON storage.objects;
DROP POLICY IF EXISTS "prospect_files_insert" ON storage.objects;

CREATE POLICY "prospect_files_select_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'prospect-files'
    AND (
      (storage.foldername(name))[1] = get_my_company_id()::text
      OR is_admin()
    )
  );

CREATE POLICY "prospect_files_insert_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prospect-files'
    AND (
      (storage.foldername(name))[1] = get_my_company_id()::text
      OR is_admin()
    )
  );

-- social-screenshots : restreindre au dossier du user
DROP POLICY IF EXISTS "social-screenshots: auth users can read" ON storage.objects;
DROP POLICY IF EXISTS "social-screenshots: auth users can upload" ON storage.objects;
DROP POLICY IF EXISTS "social_screenshots_select" ON storage.objects;
DROP POLICY IF EXISTS "social_screenshots_insert" ON storage.objects;

CREATE POLICY "social_screenshots_select_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'social-screenshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

CREATE POLICY "social_screenshots_insert_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- message-attachments : restreindre au dossier du user
DROP POLICY IF EXISTS "message-attachments: auth users can read" ON storage.objects;
DROP POLICY IF EXISTS "message-attachments: auth users can upload" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_insert" ON storage.objects;

CREATE POLICY "message_attachments_select_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

CREATE POLICY "message_attachments_insert_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
