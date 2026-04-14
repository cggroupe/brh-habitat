-- Migration v8: Corrections audit complet 2026-04-14
-- Fixes: C1 (contrainte phone→telephone), H1 (niveau partenaire), M5 (diagnostic draft),
--        M3 (chiffrage UPDATE), M7 (home-documents admin)

-- ============================================================================
-- C1: Contrainte telephone — corrige directement dans v7, rien a faire ici
-- ============================================================================

-- ============================================================================
-- H1: Retablir calcul niveau partenaire dans update_company_ca
-- La version v7 avait perdu le bloc RETURNING + level update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_company_ca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_new_ca INTEGER;
  v_settings RECORD;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM public.brh_prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_company_id IS NOT NULL THEN
    UPDATE public.brh_companies
    SET total_ca_apporte = total_ca_apporte + NEW.amount,
        updated_at = NOW()
    WHERE id = v_company_id
    RETURNING total_ca_apporte INTO v_new_ca;

    SELECT * INTO v_settings
    FROM public.brh_platform_settings
    WHERE key = 'global';

    IF v_settings IS NOT NULL THEN
      UPDATE public.brh_companies SET level = CASE
        WHEN v_new_ca >= v_settings.pro_platinum_threshold THEN 'platinum'
        WHEN v_new_ca >= v_settings.pro_gold_threshold THEN 'gold'
        WHEN v_new_ca >= v_settings.pro_silver_threshold THEN 'silver'
        ELSE 'bronze'
      END WHERE id = v_company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- M5: Contrainte CHECK status diagnostics — ajouter 'draft'
-- La migration 20260326170000 n'avait pas reellement modifie la contrainte
-- ============================================================================
ALTER TABLE public.brh_diagnostics DROP CONSTRAINT IF EXISTS brh_diagnostics_status_check;
ALTER TABLE public.brh_diagnostics ADD CONSTRAINT brh_diagnostics_status_check
  CHECK (status IN ('draft', 'pending', 'analyzed', 'contacted', 'closed'));

-- ============================================================================
-- M3: Policy UPDATE sur brh_chiffrages pour le proprietaire
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brh_chiffrages' AND policyname = 'User modifie ses chiffrages'
  ) THEN
    CREATE POLICY "User modifie ses chiffrages" ON public.brh_chiffrages
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- M7: Policies admin sur bucket home-documents
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Admin can read all home documents'
  ) THEN
    CREATE POLICY "Admin can read all home documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'home-documents' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Admin can update all home documents'
  ) THEN
    CREATE POLICY "Admin can update all home documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'home-documents' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Admin can delete all home documents'
  ) THEN
    CREATE POLICY "Admin can delete all home documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'home-documents' AND public.is_admin());
  END IF;
END $$;
