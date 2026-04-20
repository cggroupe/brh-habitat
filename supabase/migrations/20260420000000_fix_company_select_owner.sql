-- Migration: Fix RLS SELECT sur brh_companies pour le owner
-- Date: 2026-04-20
-- Bug: A l'inscription pro, createCompany fait .insert().select().single()
--      Le SELECT policy exige id = get_my_company_id(), qui lit brh_company_members
--      Or le user n'est pas encore membre (addCompanyMember est appele APRES).
--      Resultat : SELECT retourne 0 rows -> .single() throw -> "Erreur lors de
--      la creation de l'entreprise. Veuillez reessayer."
-- Fix : ajouter une policy SELECT qui autorise le owner a voir sa company.

CREATE POLICY "Owner voit sa company" ON brh_companies FOR SELECT
  USING (owner_id = auth.uid());
