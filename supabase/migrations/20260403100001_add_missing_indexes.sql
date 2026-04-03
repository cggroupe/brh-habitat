-- Migration: Add missing indexes on foreign key columns
-- Date: 2026-04-03
-- Issue: brh_cases and brh_appointments missing indexes on FK columns used in joins

CREATE INDEX IF NOT EXISTS idx_brh_cases_home ON brh_cases(home_id);
CREATE INDEX IF NOT EXISTS idx_brh_cases_diagnostic ON brh_cases(diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_brh_appointments_case ON brh_appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_brh_appointments_home ON brh_appointments(home_id);
