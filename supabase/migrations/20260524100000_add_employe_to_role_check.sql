-- =============================================================================
-- 2026-05-24 — Phase A3 dette technique : ajout du rôle 'employe' au check
-- =============================================================================
--
-- Contexte du mismatch silencieux (documenté dans handoff-2026-05-22.md) :
--   - 29 RPCs filtrent sur `profiles.role IN ('admin','pro','employe')`
--   - Le frontend (ReseauPortalShell, ArtisanGuard, ReseauGuard, UnifiedLeadsView)
--     route et autorise sur `profile.role === 'employe'`
--   - MAIS `profiles.role_check` ne listait que ['user','admin','pro','particulier']
--   - Conséquence : impossible d'avoir un user avec role='employe'
--     → workaround historique : tous les employés BRH ont role='admin'
--       (Pierre Collard par exemple)
--
-- Cette migration aligne le check constraint avec l'usage réel.
-- Aucun user existant n'a role='employe' (interdit jusqu'ici), donc pas de
-- backfill nécessaire. Les futurs employés pourront être créés directement
-- avec role='employe' (au lieu de surfacer admin).
-- =============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'user'::text,
    'admin'::text,
    'pro'::text,
    'particulier'::text,
    'employe'::text
  ]));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Rôles supportés : user (par défaut), admin (super-user), pro (artisan/agence/notaire), particulier (propriétaire), employe (BRH interne). Ajout employe le 2026-05-24 — voir handoff-2026-05-22.md.';
