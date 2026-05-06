-- =============================================================================
-- Phase 18.6 — Storage bucket `reseau-media` privé pour photos posts/chantiers
-- =============================================================================
--
-- Bucket privé. Lecture via signed URLs (TTL 1h vue / 1an stockage long).
-- 2 versions stockées par photo :
--   {post_id}/{idx}_original.jpg  — privé, ne jamais servir publiquement
--   {post_id}/{idx}_public.jpg    — version floutée Canvas client-side
--
-- RLS Storage : auteur uploader sur son own folder (post_id matche un post
-- dont author_pro_id = user.brh_user_pro_id()).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Création du bucket privé (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reseau-media',
  'reseau-media',
  false,
  10485760, -- 10 MB max par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS Storage : authentifié peut lire les fichiers _public.jpg
--    (signed URLs émis côté API, mais autorisation lecture base requise)
DROP POLICY IF EXISTS "Reseau media auth read public" ON storage.objects;
CREATE POLICY "Reseau media auth read public"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reseau-media'
    AND name LIKE '%_public.jpg'
  );

-- 3. RLS Storage : owner peut lire ses _original.jpg
DROP POLICY IF EXISTS "Reseau media owner read original" ON storage.objects;
CREATE POLICY "Reseau media owner read original"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reseau-media'
    AND owner = auth.uid()
  );

-- 4. RLS Storage : authenticated peut uploader dans son propre folder
DROP POLICY IF EXISTS "Reseau media auth insert" ON storage.objects;
CREATE POLICY "Reseau media auth insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reseau-media'
    AND owner = auth.uid()
  );

-- 5. RLS Storage : owner peut delete ses fichiers (RGPD droit à l'oubli)
DROP POLICY IF EXISTS "Reseau media owner delete" ON storage.objects;
CREATE POLICY "Reseau media owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'reseau-media'
    AND owner = auth.uid()
  );

-- 6. Admin BRH a tous les droits (modération + RGPD purge)
DROP POLICY IF EXISTS "Reseau media admin all" ON storage.objects;
CREATE POLICY "Reseau media admin all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'reseau-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'reseau-media'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

COMMIT;

-- Vérification
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'reseau-media';
