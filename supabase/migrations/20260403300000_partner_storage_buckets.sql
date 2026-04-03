-- Migration: Partner Platform - Storage Buckets
-- Date: 2026-04-03

-- Bucket pour fichiers prospects (prive)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospect-files',
  'prospect-files',
  false,
  10485760, -- 10 Mo
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Bucket pour images catalogue cadeaux (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rewards-catalog', 'rewards-catalog', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour logos entreprises (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage — prospect-files
CREATE POLICY "Pro upload prospect files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prospect-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Pro read own prospect files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prospect-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin manage all prospect files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'prospect-files'
    AND public.is_admin()
  );

-- RLS Storage — rewards-catalog (public read, admin write)
CREATE POLICY "Anyone read rewards catalog"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rewards-catalog');

CREATE POLICY "Admin manage rewards catalog"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'rewards-catalog'
    AND public.is_admin()
  );

-- RLS Storage — company-logos (public read, owner write)
CREATE POLICY "Anyone read company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Pro upload company logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin manage company logos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'company-logos'
    AND public.is_admin()
  );
