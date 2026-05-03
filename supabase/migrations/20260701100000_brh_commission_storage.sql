-- Migration Phase 13.6.7.2 — Bucket Storage pour PDF factures commission
--
-- Pattern aligné avec brh_audit_pdfs (Phase 4) : bucket dédié, RLS strict,
-- PDF généré côté front + uploadé via supabase-js, signed URL 30j envoyée par email.

-- ============================================================================
-- Storage bucket : brh-commission-invoices
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brh-commission-invoices',
  'brh-commission-invoices',
  false,                        -- privé (lecture via signed URL uniquement)
  10485760,                     -- 10 MB max par PDF
  ARRAY['application/pdf']::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ALTER brh_commission_invoices : tracker le PDF stocké
-- ============================================================================
ALTER TABLE brh_commission_invoices
  ADD COLUMN IF NOT EXISTS pdf_path TEXT,            -- path dans le bucket
  ADD COLUMN IF NOT EXISTS pdf_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_resend_id TEXT;

CREATE INDEX IF NOT EXISTS brh_commission_pdf ON brh_commission_invoices(pdf_path) WHERE pdf_path IS NOT NULL;

-- ============================================================================
-- RLS Storage policies (admin upload + lecture, artisan lecture seule)
-- Note : DROP IF EXISTS pour idempotence en cas de re-run
-- ============================================================================
DROP POLICY IF EXISTS "admin_all_commission_pdfs" ON storage.objects;
CREATE POLICY "admin_all_commission_pdfs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'brh-commission-invoices'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "artisan_read_own_commission_pdfs" ON storage.objects;
CREATE POLICY "artisan_read_own_commission_pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'brh-commission-invoices'
  AND split_part(name, '/', 1) IN (
    SELECT id::text FROM brh_artisans_rge WHERE profile_id = auth.uid()
  )
);
-- Path conventionnel : '{artisan.id}/{year}/{month}.pdf' — accès via signed URL 30 jours
