-- 2026-05-19 — Table matérialisée brh_dirigeants : 1 ligne par dirigeant
-- unique (couple nom + prénom + date_naissance) avec patrimoine cross-SCI.
--
-- Aujourd'hui les dirigeants sont enfouis dans brh_sci_companies.dirigeants
-- (jsonb array). Difficile de répondre à :
-- - "M. Dupont 12/03/1950 dirige combien de SCI ?"
-- - "Quel patrimoine immobilier total ?"
-- - "Est-il décédé ? (succession ouverte)"
--
-- Cette table consolide tout par DIRIGEANT.

CREATE TABLE IF NOT EXISTS public.brh_dirigeants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité (clé naturelle = nom + prenom + dob)
  nom text NOT NULL,
  prenom text NOT NULL,
  date_naissance date,
  -- Clé normalisée pour dédoublonnage : minuscules, sans accents, sans punct
  nom_norm text GENERATED ALWAYS AS (lower(regexp_replace(nom, '[^a-zA-ZÀ-ÿ]', '', 'g'))) STORED,
  prenom_norm text GENERATED ALWAYS AS (lower(regexp_replace(prenom, '[^a-zA-ZÀ-ÿ]', '', 'g'))) STORED,

  -- Patrimoine cross-SCI
  sci_dirigees jsonb DEFAULT '[]'::jsonb,  -- [{siren, denomination, forme, qualite, is_active, date_creation}]
  nb_sci_dirigees int DEFAULT 0,
  nb_sci_actives int DEFAULT 0,
  nb_dpe_total int DEFAULT 0,  -- nb DPE détenus via toutes ses SCI

  -- Décès / succession
  est_decede boolean DEFAULT FALSE,
  deces_date date,
  deces_commune text,
  succession_potentielle boolean DEFAULT FALSE,

  -- OSINT enrichissable (employé terrain)
  osint_adresse_perso text,
  osint_telephone text,
  osint_email text,
  osint_linkedin text,
  osint_other jsonb DEFAULT '{}'::jsonb,

  -- Édition employé terrain
  employee_notes text,
  interet_brh text
    CHECK (interet_brh IN ('chaud','tiede','froid','a_recontacter','refus','inconnu') OR interet_brh IS NULL),
  derniere_visite_terrain date,
  employee_updated_at timestamptz,
  employee_updated_by uuid REFERENCES public.profiles(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unicité : nom+prenom+dob (dob NULL accepté plusieurs fois → fallback)
  CONSTRAINT brh_dirigeants_unique_natural UNIQUE NULLS NOT DISTINCT
    (nom_norm, prenom_norm, date_naissance)
);

CREATE INDEX IF NOT EXISTS brh_dirigeants_nom_idx
  ON public.brh_dirigeants (nom_norm, prenom_norm);
CREATE INDEX IF NOT EXISTS brh_dirigeants_dob_idx
  ON public.brh_dirigeants (date_naissance) WHERE date_naissance IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dirigeants_succession_idx
  ON public.brh_dirigeants (succession_potentielle) WHERE succession_potentielle = TRUE;
CREATE INDEX IF NOT EXISTS brh_dirigeants_nb_sci_idx
  ON public.brh_dirigeants (nb_sci_dirigees DESC);

ALTER TABLE public.brh_dirigeants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brh_dirigeants_select ON public.brh_dirigeants;
CREATE POLICY brh_dirigeants_select ON public.brh_dirigeants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

COMMENT ON TABLE public.brh_dirigeants IS
  '2026-05-19 — Dirigeants de SCI consolidés (1 ligne par personne unique). Patrimoine cross-SCI, succession, OSINT enrichissable.';

-- ============================================================
-- Fonction de backfill : extrait depuis brh_sci_companies.dirigeants
-- ============================================================
CREATE OR REPLACE FUNCTION public.brh_dirigeants_recompute()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_total int;
BEGIN
  -- Vider la table (recompute complet) — préserve les colonnes employé
  CREATE TEMP TABLE _emp_overlay AS
  SELECT id, osint_adresse_perso, osint_telephone, osint_email, osint_linkedin,
         osint_other, employee_notes, interet_brh, derniere_visite_terrain,
         employee_updated_at, employee_updated_by,
         nom_norm, prenom_norm, date_naissance
  FROM public.brh_dirigeants;

  TRUNCATE public.brh_dirigeants;

  -- Recompute depuis SCI
  WITH dirigeants_flat AS (
    SELECT
      trim(d->>'nom') AS nom,
      trim(d->>'prenom') AS prenom,
      NULLIF(d->>'date_naissance', '')::date AS date_naissance,
      d->>'qualite' AS qualite,
      (d->>'est_decede')::boolean AS est_decede,
      NULLIF(d->>'deces_date', '')::date AS deces_date,
      d->>'deces_commune' AS deces_commune,
      s.siren::text AS siren,
      s.denomination,
      s.forme_juridique,
      s.is_active,
      s.date_creation
    FROM public.brh_sci_companies s,
         jsonb_array_elements(s.dirigeants) d
    WHERE jsonb_typeof(s.dirigeants) = 'array'
      AND d->>'nom' IS NOT NULL AND d->>'prenom' IS NOT NULL
      AND length(trim(d->>'nom')) >= 2 AND length(trim(d->>'prenom')) >= 2
  ),
  dirigeants_grouped AS (
    SELECT
      nom, prenom, date_naissance,
      jsonb_agg(jsonb_build_object(
        'siren', siren,
        'denomination', denomination,
        'forme_juridique', forme_juridique,
        'qualite', qualite,
        'is_active', is_active,
        'date_creation', date_creation
      ) ORDER BY date_creation DESC NULLS LAST) AS sci_dirigees,
      COUNT(*)::int AS nb_sci_dirigees,
      COUNT(*) FILTER (WHERE is_active)::int AS nb_sci_actives,
      bool_or(est_decede) AS est_decede,
      MAX(deces_date) AS deces_date,
      MIN(deces_commune) FILTER (WHERE deces_commune IS NOT NULL) AS deces_commune
    FROM dirigeants_flat
    GROUP BY nom, prenom, date_naissance
  ),
  dpe_counts AS (
    -- Pour chaque (nom, prenom, dob), compte les DPE détenus via les SCI
    SELECT dg.nom, dg.prenom, dg.date_naissance,
           COUNT(DISTINCT dp.id) AS nb_dpe
    FROM dirigeants_grouped dg,
         jsonb_array_elements(dg.sci_dirigees) AS sci
    LEFT JOIN public.brh_dpe_prospects dp ON dp.owner_siren = (sci->>'siren')
    GROUP BY dg.nom, dg.prenom, dg.date_naissance
  )
  INSERT INTO public.brh_dirigeants
    (nom, prenom, date_naissance, sci_dirigees, nb_sci_dirigees, nb_sci_actives,
     nb_dpe_total, est_decede, deces_date, deces_commune, succession_potentielle)
  SELECT
    dg.nom, dg.prenom, dg.date_naissance,
    dg.sci_dirigees, dg.nb_sci_dirigees, dg.nb_sci_actives,
    COALESCE(dc.nb_dpe, 0),
    COALESCE(dg.est_decede, FALSE),
    dg.deces_date, dg.deces_commune,
    COALESCE(dg.est_decede, FALSE) AND dg.nb_sci_dirigees > 0
  FROM dirigeants_grouped dg
  LEFT JOIN dpe_counts dc ON dc.nom = dg.nom AND dc.prenom = dg.prenom
    AND dc.date_naissance IS NOT DISTINCT FROM dg.date_naissance;

  -- Restaure les overlays employé (par clé naturelle nom_norm+prenom_norm+dob)
  UPDATE public.brh_dirigeants d
  SET osint_adresse_perso = o.osint_adresse_perso,
      osint_telephone = o.osint_telephone,
      osint_email = o.osint_email,
      osint_linkedin = o.osint_linkedin,
      osint_other = COALESCE(o.osint_other, '{}'::jsonb),
      employee_notes = o.employee_notes,
      interet_brh = o.interet_brh,
      derniere_visite_terrain = o.derniere_visite_terrain,
      employee_updated_at = o.employee_updated_at,
      employee_updated_by = o.employee_updated_by
  FROM _emp_overlay o
  WHERE d.nom_norm = o.nom_norm
    AND d.prenom_norm = o.prenom_norm
    AND d.date_naissance IS NOT DISTINCT FROM o.date_naissance;

  DROP TABLE _emp_overlay;

  SELECT COUNT(*) INTO v_total FROM public.brh_dirigeants;
  RETURN jsonb_build_object('dirigeants_total', v_total, 'computed_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dirigeants_recompute() TO authenticated;

COMMENT ON FUNCTION public.brh_dirigeants_recompute IS
  '2026-05-19 — Backfill / recompute table brh_dirigeants depuis brh_sci_companies.dirigeants. Préserve les overlays employé.';
