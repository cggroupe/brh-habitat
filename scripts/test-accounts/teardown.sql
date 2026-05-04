-- =============================================================================
-- BRH Habitat — Cleanup des 6 comptes de test
-- =============================================================================
-- Usage :
--   PGPASSWORD='Brh29200..@@' psql \
--     "postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
--     -f scripts/test-accounts/teardown.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Cascade depuis auth.users supprime profiles + tout ce qui dépend (RLS ON DELETE CASCADE)
DELETE FROM brh_agence_subscriptions WHERE agence_id = '33333333-cccc-3333-cccc-333333333333';
DELETE FROM brh_partner_contracts WHERE signer_profile_id = 'fff66666-6666-6666-6666-666666666666';
DELETE FROM brh_agences_immo WHERE id = '33333333-cccc-3333-cccc-333333333333';
DELETE FROM brh_artisans_rge WHERE id = '22222222-bbbb-2222-bbbb-222222222222';
DELETE FROM brh_company_members WHERE company_id = '11111111-aaaa-1111-aaaa-111111111111';
DELETE FROM brh_companies WHERE id = '11111111-aaaa-1111-aaaa-111111111111';
DELETE FROM brh_affiliates WHERE id = 'ddd44444-4444-4444-4444-444444444444';

DELETE FROM auth.users WHERE email LIKE '%@brh-test.fr';

COMMIT;

SELECT 'Cleanup terminé. ' || count(*) || ' comptes test restants.' AS status
FROM auth.users WHERE email LIKE '%@brh-test.fr';
