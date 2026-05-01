-- Migration : Storage bucket pour les PDFs d'audit DPE (Phase 4.1)
-- Source : caprenov-reverse/decisions/PLAN-PHASE-4.md (générique)

-- Bucket privé : seuls le pro RGE qui a fait l'audit et le particulier client peuvent lire.
-- Path convention : audits/{audit_id}.pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audits',
  'audits',
  false,
  20971520, -- 20 MB max (un audit DPE complet ~2-5 MB suffit)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS policies bucket 'audits'
-- ============================================================================

-- Pro RGE ou particulier propriétaire peut lire son PDF (path = audit_id)
CREATE POLICY "audit_owner_read_pdf" ON storage.objects FOR SELECT
USING (
  bucket_id = 'audits'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM brh_audits a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND (a.pro_user_id = auth.uid() OR a.user_id = auth.uid())
  )
);

-- Pro RGE peut uploader/écraser le PDF d'un de ses audits draft ou submitted
CREATE POLICY "pro_write_audit_pdf" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audits'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM brh_audits a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.pro_user_id = auth.uid()
  )
);

CREATE POLICY "pro_update_audit_pdf" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audits'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM brh_audits a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.pro_user_id = auth.uid()
  )
);

-- Admin peut tout faire
CREATE POLICY "admin_all_audit_pdf" ON storage.objects FOR ALL
USING (
  bucket_id = 'audits'
  AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- Table de log envois email (optionnel, pour audit trail RGPD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS brh_audit_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES brh_audits(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  resend_id TEXT, -- ID retourné par Resend pour traçabilité
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_audit_emails_audit ON brh_audit_emails(audit_id);
CREATE INDEX idx_brh_audit_emails_sent_by ON brh_audit_emails(sent_by);

ALTER TABLE brh_audit_emails ENABLE ROW LEVEL SECURITY;

-- Pro qui a envoyé peut voir ses propres logs
CREATE POLICY "pro_select_own_emails" ON brh_audit_emails FOR SELECT
  USING (sent_by = auth.uid());

-- Pro qui a envoyé peut insérer (via EF avec service_role en pratique)
CREATE POLICY "pro_insert_own_emails" ON brh_audit_emails FOR INSERT
  WITH CHECK (sent_by = auth.uid());

-- Admin accès complet
CREATE POLICY "admin_all_emails" ON brh_audit_emails FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE brh_audit_emails IS
  'Log des envois email d''audits DPE (audit trail RGPD).';
