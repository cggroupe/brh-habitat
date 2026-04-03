-- Migration: Extend profiles role CHECK for Partner Platform
-- Date: 2026-04-03
-- Adds 'pro' and 'particulier' roles for upcoming Partner Platform
-- is_admin() remains unchanged (only returns true for role = 'admin')

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'pro', 'particulier'));
