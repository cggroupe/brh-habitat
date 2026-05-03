#!/usr/bin/env bash
# Phase R11 — Vérifie l'état des migrations R1 (permissions + tracking + agences) en cloud.
#
# Usage : ./scripts/verify-r1-rls.sh
# Pré-requis : variable BRH_SUPABASE_DB_PASSWORD dans /opt/stack/.env
# (déjà posée par R1 push 2026-05-03).

set -euo pipefail

PASSWORD="${BRH_SUPABASE_DB_PASSWORD:-${BRH_SUPABASE_DB_PASSWORD:?Set this env var first}}"
DB_URL="postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

echo "=== Phase R11 — Audit RLS post-migration R1 ==="
echo

PGPASSWORD="$PASSWORD" psql "$DB_URL" -X -A -t <<'SQL'
\echo "--- 1. Tables R1 présentes ---"
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('brh_field_visits','brh_agences_immo','brh_company_members')
ORDER BY table_name;

\echo
\echo "--- 2. Colonne permissions JSONB sur brh_company_members ---"
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name='brh_company_members' AND column_name='permissions';

\echo
\echo "--- 3. Helper brh_user_can ---"
SELECT proname,
       pg_get_function_arguments(oid) AS args,
       pg_get_function_result(oid) AS result,
       prosecdef AS security_definer
FROM pg_proc
WHERE proname='brh_user_can';

\echo
\echo "--- 4. Policies brh_field_visits (5 attendues) ---"
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.brh_field_visits'::regclass
ORDER BY polname;

\echo
\echo "--- 5. Policies brh_agences_immo (2 attendues) ---"
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.brh_agences_immo'::regclass
ORDER BY polname;

\echo
\echo "--- 6. RLS activée sur les 2 nouvelles tables ---"
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('brh_field_visits','brh_agences_immo');

\echo
\echo "--- 7. Indexes brh_field_visits ---"
SELECT indexname FROM pg_indexes
WHERE tablename='brh_field_visits' ORDER BY indexname;

\echo
\echo "--- 8. Test fonctionnel brh_user_can ---"
-- Sans user_id NULL → FALSE
SELECT 'NULL user'   AS scenario, brh_user_can(NULL, 'canViewFinance')                                AS result;
-- User inexistant → FALSE
SELECT 'unknown'     AS scenario, brh_user_can('00000000-0000-0000-0000-000000000000', 'canViewFinance') AS result;
SQL

echo
echo "=== Audit terminé. Tout doit être présent : 3 tables, 1 colonne, 1 helper, 5+2 policies, 4+ indexes. ==="
