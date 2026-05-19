-- 2026-05-19 — Champs édition employé BRH sur brh_personnes_historique + brh_dpe_prospects.
--
-- But métier : les commerciaux BRH font du terrain. Ils doivent pouvoir
-- mettre à jour la fiche d'un contact ou d'une adresse DPE quand ils
-- récupèrent une info (travaux faits, DPE estimé après rénovation, intérêt
-- commercial, dispo, notes libres).
--
-- Pattern : colonnes structurées + audit log table.

-- ============================================================
-- 1. brh_personnes_historique — champs édition employé
-- ============================================================
ALTER TABLE public.brh_personnes_historique
  ADD COLUMN IF NOT EXISTS employee_notes text,
  ADD COLUMN IF NOT EXISTS travaux_terrain_status text
    CHECK (travaux_terrain_status IN ('aucun','partiel','total','inconnu') OR travaux_terrain_status IS NULL),
  ADD COLUMN IF NOT EXISTS dpe_terrain_estime text,
  ADD COLUMN IF NOT EXISTS interet_brh text
    CHECK (interet_brh IN ('chaud','tiede','froid','a_recontacter','refus','inconnu') OR interet_brh IS NULL),
  ADD COLUMN IF NOT EXISTS contact_disponibilite text
    CHECK (contact_disponibilite IN ('matin','apres_midi','soir','weekend','inconnu') OR contact_disponibilite IS NULL),
  ADD COLUMN IF NOT EXISTS derniere_visite_terrain date,
  ADD COLUMN IF NOT EXISTS employee_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS employee_updated_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS brh_personnes_interet_idx
  ON public.brh_personnes_historique (interet_brh)
  WHERE interet_brh IS NOT NULL;

COMMENT ON COLUMN public.brh_personnes_historique.employee_notes IS
  '2026-05-19 — Notes libres employé terrain BRH (visite, retour client, contexte).';
COMMENT ON COLUMN public.brh_personnes_historique.travaux_terrain_status IS
  '2026-05-19 — Statut travaux confirmé en visite : aucun/partiel/total/inconnu.';
COMMENT ON COLUMN public.brh_personnes_historique.dpe_terrain_estime IS
  '2026-05-19 — DPE estimé après visite terrain (ex: "F → D après ITE 2024").';
COMMENT ON COLUMN public.brh_personnes_historique.interet_brh IS
  '2026-05-19 — Intérêt commercial : chaud/tiede/froid/a_recontacter/refus.';

-- ============================================================
-- 2. brh_dpe_prospects — mêmes champs édition (pattern identique)
-- ============================================================
ALTER TABLE public.brh_dpe_prospects
  ADD COLUMN IF NOT EXISTS employee_notes text,
  ADD COLUMN IF NOT EXISTS travaux_terrain_status text
    CHECK (travaux_terrain_status IN ('aucun','partiel','total','inconnu') OR travaux_terrain_status IS NULL),
  ADD COLUMN IF NOT EXISTS dpe_terrain_estime text,
  ADD COLUMN IF NOT EXISTS interet_brh text
    CHECK (interet_brh IN ('chaud','tiede','froid','a_recontacter','refus','inconnu') OR interet_brh IS NULL),
  ADD COLUMN IF NOT EXISTS contact_disponibilite text
    CHECK (contact_disponibilite IN ('matin','apres_midi','soir','weekend','inconnu') OR contact_disponibilite IS NULL),
  ADD COLUMN IF NOT EXISTS derniere_visite_terrain date,
  ADD COLUMN IF NOT EXISTS employee_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS employee_updated_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS brh_dpe_prospects_interet_idx
  ON public.brh_dpe_prospects (interet_brh)
  WHERE interet_brh IS NOT NULL;

-- ============================================================
-- 3. Table audit log (commun aux 2 tables)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brh_employee_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('personne_brh','adresse_dpe')),
  entity_id   text NOT NULL,
  employee_id uuid REFERENCES public.profiles(id),
  edited_at   timestamptz NOT NULL DEFAULT now(),
  field_changed text NOT NULL,
  old_value   text,
  new_value   text
);

CREATE INDEX IF NOT EXISTS brh_emp_edit_log_entity_idx
  ON public.brh_employee_edit_log (entity_type, entity_id, edited_at DESC);

ALTER TABLE public.brh_employee_edit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brh_emp_edit_log_select ON public.brh_employee_edit_log;
CREATE POLICY brh_emp_edit_log_select ON public.brh_employee_edit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

COMMENT ON TABLE public.brh_employee_edit_log IS
  '2026-05-19 — Audit log éditions employé terrain (BRH internes).';
