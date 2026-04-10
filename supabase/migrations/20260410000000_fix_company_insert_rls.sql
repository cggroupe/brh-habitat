-- Migration: Fix RLS INSERT sur brh_companies et brh_company_members
-- Date: 2026-04-10
-- Bug: Un pro ne pouvait pas creer son entreprise a l'inscription (pas de policy INSERT)

-- Permettre aux pros de creer leur entreprise (owner_id = auth.uid())
CREATE POLICY "Pro cree sa company" ON brh_companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Permettre aux pros de creer leur membership (se lier a leur entreprise)
CREATE POLICY "Pro cree son membership" ON brh_company_members FOR INSERT
  WITH CHECK (profile_id = auth.uid());
