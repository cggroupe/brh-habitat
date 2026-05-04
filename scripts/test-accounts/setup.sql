-- =============================================================================
-- BRH Habitat — 6 comptes de test pour valider tous les portails
-- =============================================================================
--
-- Objectif : permettre à Philippe de se connecter avec un email/mdp connu
-- pour tester chacun des 6 portails (admin / pro-owner / pro-member / particulier
-- / artisan / agence) sans devoir passer par l'onboarding complet.
--
-- Mot de passe pour TOUS les comptes : BrhTest2026!
--
-- Usage :
--   PGPASSWORD='Brh29200..@@' psql \
--     "postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
--     -f scripts/test-accounts/setup.sql
--
-- Idempotent : peut être ré-exécuté autant de fois que nécessaire.
-- Cleanup : voir scripts/test-accounts/teardown.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Préparer 6 comptes auth.users (idempotent via email UNIQUE)
-- -----------------------------------------------------------------------------
-- Pattern : delete si existe puis insert. Cascade vers profiles + memberships.
DELETE FROM auth.users
WHERE email IN (
  'admin@brh-test.fr',
  'pro-owner@brh-test.fr',
  'pro-member@brh-test.fr',
  'particulier@brh-test.fr',
  'artisan@brh-test.fr',
  'agence@brh-test.fr'
);

-- Insertion atomique avec UUIDs fixes pour pouvoir y faire référence ensuite
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  ('00000000-0000-0000-0000-000000000000',
   'aaa11111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Admin Test","role":"admin"}'::jsonb,
   FALSE, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'bbb22222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'pro-owner@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Marie Dupont (Pro Owner)","role":"pro"}'::jsonb,
   FALSE, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'ccc33333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'pro-member@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Lucas Martin (Pro Member)","role":"pro"}'::jsonb,
   FALSE, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'ddd44444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'particulier@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Sophie Bernard (Particulier)","role":"particulier"}'::jsonb,
   FALSE, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'eee55555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'artisan@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Jean Le Goff (Artisan RGE)","role":"user"}'::jsonb,
   FALSE, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'fff66666-6666-6666-6666-666666666666', 'authenticated', 'authenticated',
   'agence@brh-test.fr', crypt('BrhTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Claire Pichon (Agence Immo)","role":"user"}'::jsonb,
   FALSE, '', '', '', '');

-- -----------------------------------------------------------------------------
-- 2. Forcer les rôles dans profiles (au cas où le trigger handle_new_user
--    n'aurait pas pris le metadata)
-- -----------------------------------------------------------------------------
UPDATE profiles SET role='admin', full_name='Admin Test'
  WHERE id = 'aaa11111-1111-1111-1111-111111111111';
UPDATE profiles SET role='pro', full_name='Marie Dupont (Pro Owner)'
  WHERE id = 'bbb22222-2222-2222-2222-222222222222';
UPDATE profiles SET role='pro', full_name='Lucas Martin (Pro Member)'
  WHERE id = 'ccc33333-3333-3333-3333-333333333333';
UPDATE profiles SET role='particulier', full_name='Sophie Bernard (Particulier)'
  WHERE id = 'ddd44444-4444-4444-4444-444444444444';
UPDATE profiles SET role='user', full_name='Jean Le Goff (Artisan RGE)'
  WHERE id = 'eee55555-5555-5555-5555-555555555555';
UPDATE profiles SET role='user', full_name='Claire Pichon (Agence Immo)'
  WHERE id = 'fff66666-6666-6666-6666-666666666666';

-- -----------------------------------------------------------------------------
-- 3. Pro-owner : entreprise + lien membre owner
-- -----------------------------------------------------------------------------
DELETE FROM brh_company_members WHERE profile_id IN (
  'bbb22222-2222-2222-2222-222222222222',
  'ccc33333-3333-3333-3333-333333333333'
);
DELETE FROM brh_companies WHERE id = '11111111-aaaa-1111-aaaa-111111111111';

INSERT INTO brh_companies (
  id, owner_id, name, siret, profession, level, total_ca_apporte,
  address, city, postal_code, is_active
) VALUES (
  '11111111-aaaa-1111-aaaa-111111111111',
  'bbb22222-2222-2222-2222-222222222222',
  'Habitat Pro Bretagne (Test)',
  '12345678901234',
  'architecte',
  'silver',
  250000,
  '12 rue du Test',
  'Rennes',
  '35000',
  TRUE
);

-- pro-owner : member_role='owner', permissions ignorées (owner = tout autorisé)
INSERT INTO brh_company_members (company_id, profile_id, member_role, permissions)
VALUES (
  '11111111-aaaa-1111-aaaa-111111111111',
  'bbb22222-2222-2222-2222-222222222222',
  'owner',
  '{}'::jsonb
);

-- pro-member : member_role='member', permissions LIMITEES (test du PermissionGate/PermissionRoute)
-- Permissions activées : canExport, canSendCourriers (commercial standard)
-- Permissions DÉSACTIVÉES : canViewFinance, canManageEmployees, canManageMarketplace
INSERT INTO brh_company_members (company_id, profile_id, member_role, permissions)
VALUES (
  '11111111-aaaa-1111-aaaa-111111111111',
  'ccc33333-3333-3333-3333-333333333333',
  'member',
  '{"canViewFinance": false, "canManageEmployees": false, "canExport": true, "canSendCourriers": true, "canManageMarketplace": false}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 4. Particulier : affiliate + 2500 points (pour voir le catalogue actif)
-- -----------------------------------------------------------------------------
DELETE FROM brh_affiliates WHERE id = 'ddd44444-4444-4444-4444-444444444444';
INSERT INTO brh_affiliates (id, referral_code, level, points_balance, total_points_earned, short_code)
VALUES (
  'ddd44444-4444-4444-4444-444444444444',
  'TESTPART01',
  'standard',
  2500,
  2500,
  'TP01'
);

-- -----------------------------------------------------------------------------
-- 5. Artisan : brh_artisans_rge.profile_id pour le ArtisanGuard
-- -----------------------------------------------------------------------------
DELETE FROM brh_artisans_rge WHERE id = '22222222-bbbb-2222-bbbb-222222222222';

INSERT INTO brh_artisans_rge (
  id, profile_id, siret, nom_entreprise, representant, email, telephone,
  adresse, code_postal, commune, code_insee, departement,
  latitude, longitude, geste_specialites, rge_certifications
) VALUES (
  '22222222-bbbb-2222-bbbb-222222222222',
  'eee55555-5555-5555-5555-555555555555',
  '98765432101234',
  'Le Goff Rénovation Énergétique (Test)',
  'Jean Le Goff',
  'artisan@brh-test.fr',
  '0298123456',
  '5 rue des Forges',
  '29200',
  'Brest',
  '29019',
  '29',
  48.3905, -4.4861,
  ARRAY['pac_air_eau','isolation_combles','isolation_murs_ite']::TEXT[],
  '{"qualipac": "2026-12-31", "qualibat_rge": "2026-12-31"}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 6. Agence : brh_agences_immo + brh_partner_contracts(active) + subscription
-- -----------------------------------------------------------------------------
DELETE FROM brh_partner_contracts WHERE signer_profile_id = 'fff66666-6666-6666-6666-666666666666';
DELETE FROM brh_agence_subscriptions WHERE agence_id = '33333333-cccc-3333-cccc-333333333333';
DELETE FROM brh_agences_immo WHERE id = '33333333-cccc-3333-cccc-333333333333';

INSERT INTO brh_agences_immo (
  id, siret, raison_sociale, representant, email, telephone,
  adresse, code_postal, commune, code_insee, departement,
  latitude, longitude, status
) VALUES (
  '33333333-cccc-3333-cccc-333333333333',
  '70000001000099',
  'Pichon Immobilier (Test)',
  'Claire Pichon',
  'agence@brh-test.fr',
  '0299123456',
  '20 place de la République',
  '35000',
  'Rennes',
  '35238',
  '35',
  48.1116, -1.6809,
  'partenaire'
);

INSERT INTO brh_partner_contracts (
  id, partner_type, agence_id, signer_profile_id, signer_full_name, signer_email,
  signer_role, template_version, contract_content,
  consent_terms, consent_data, consent_communications,
  signed_at, signature_ip, status
) VALUES (
  '44444444-dddd-4444-dddd-444444444444',
  'agence_immo',
  '33333333-cccc-3333-cccc-333333333333',
  'fff66666-6666-6666-6666-666666666666',
  'Claire Pichon',
  'agence@brh-test.fr',
  'Gérante',
  'v1.0',
  '# Charte test v1.0 — modèle Hoguet A\n\nSignée pour démo et test interne.',
  TRUE, TRUE, TRUE,
  now(),
  '127.0.0.1'::inet,
  'active'
);

-- Subscription tier 'standard' (390 €, 30 leads/mois) pour démo
INSERT INTO brh_agence_subscriptions (
  agence_id, signer_profile_id, tier, monthly_lead_quota,
  current_month_claims, current_period_start, current_period_end
) VALUES (
  '33333333-cccc-3333-cccc-333333333333',
  'fff66666-6666-6666-6666-666666666666',
  'standard',
  30,
  3,  -- 3 leads déjà réclamés ce mois pour montrer le compteur
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month'
);

COMMIT;

-- -----------------------------------------------------------------------------
-- Récap visuel
-- -----------------------------------------------------------------------------
SELECT
  email,
  raw_user_meta_data->>'full_name' AS nom,
  CASE
    WHEN email = 'admin@brh-test.fr'        THEN 'admin       → /admin'
    WHEN email = 'pro-owner@brh-test.fr'    THEN 'pro+owner   → /pro (toutes permissions)'
    WHEN email = 'pro-member@brh-test.fr'   THEN 'pro+member  → /pro (sans Finance/Equipe/Marketplace)'
    WHEN email = 'particulier@brh-test.fr'  THEN 'particulier → /particulier (2500 pts)'
    WHEN email = 'artisan@brh-test.fr'      THEN 'user+RGE    → /artisan (brh_artisans_rge.profile_id)'
    WHEN email = 'agence@brh-test.fr'       THEN 'user+agence → /agence (charte signée + tier standard)'
  END AS portail
FROM auth.users
WHERE email LIKE '%@brh-test.fr'
ORDER BY email;
