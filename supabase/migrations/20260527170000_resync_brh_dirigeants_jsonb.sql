-- =============================================================================
-- 2026-05-27 — Resync brh_dirigeants + brh_dirigeant_sci depuis brh_sci_companies.dirigeants JSONB
-- =============================================================================
--
-- Bug : 2 007 SCI avaient leurs dirigeants UNIQUEMENT dans le JSONB
-- (brh_sci_companies.dirigeants) sans entrée dans la table normalisée
-- brh_dirigeants ni dans la jointure brh_dirigeant_sci.
--
-- Conséquence : la RPC brh_sci_search_dirigeant() ne trouvait PAS ces
-- dirigeants car elle ne consulte QUE la table normalisée.
-- Exemple : Henri Dorval, gérant SCI DU 15 AV DE LA GARE (315767533) →
-- "Aucun rôle ou patrimoine BRH connu" alors qu'il était bien dans le JSONB.
--
-- Cette migration :
--   1. INSERT les dirigeants manquants dans brh_dirigeants (nom_norm/prenom_norm
--      sont des colonnes générées — pas insérables directement)
--   2. CREATE les liens brh_dirigeant_sci pour relier dirigeants ↔ SCI
--
-- Idempotente : ON CONFLICT DO NOTHING + WHERE NOT EXISTS partout.
--
-- Exécuté manuellement le 27/05 via Management API (résultat : 6 663 dirigeants
-- ajoutés, 2 007 SCI relinkées, 8 SCI résiduelles edge case sans nom valide).
-- =============================================================================

-- Step 1 : Sync brh_dirigeants depuis JSONB
INSERT INTO public.brh_dirigeants (nom, prenom, date_naissance, est_decede, deces_date)
SELECT DISTINCT ON (nom_norm, prenom_norm, date_naissance)
  nom, prenom, date_naissance, est_decede, deces_date
FROM (
  SELECT
    dir->>'nom' AS nom,
    COALESCE(dir->>'prenom', '') AS prenom,
    lower(regexp_replace(COALESCE(dir->>'nom',''), '[^a-zA-ZÀ-ÿ]', '', 'g')) AS nom_norm,
    lower(regexp_replace(COALESCE(dir->>'prenom',''), '[^a-zA-ZÀ-ÿ]', '', 'g')) AS prenom_norm,
    CASE
      WHEN dir->>'date_naissance' ~ '^\d{4}-\d{2}-\d{2}$' THEN (dir->>'date_naissance')::date
      WHEN dir->>'date_naissance' ~ '^\d{4}-\d{2}$'       THEN ((dir->>'date_naissance') || '-01')::date
      WHEN dir->>'date_naissance' ~ '^\d{4}$'             THEN ((dir->>'date_naissance') || '-01-01')::date
      ELSE NULL
    END AS date_naissance,
    COALESCE((dir->>'est_decede')::boolean, false) AS est_decede,
    CASE WHEN dir->>'deces_date' ~ '^\d{4}-\d{2}-\d{2}$' THEN (dir->>'deces_date')::date ELSE NULL END AS deces_date
  FROM public.brh_sci_companies s,
       jsonb_array_elements(s.dirigeants) AS dir
  WHERE jsonb_array_length(s.dirigeants) > 0
    AND dir->>'nom' IS NOT NULL
    AND length(dir->>'nom') > 0
) all_dirs
WHERE length(nom_norm) > 1
ON CONFLICT (nom_norm, prenom_norm, date_naissance) DO NOTHING;

-- Step 2 : Lier brh_dirigeant_sci
INSERT INTO public.brh_dirigeant_sci (dirigeant_id, siren, denomination, qualite, is_active, departement, date_creation, forme_juridique)
SELECT DISTINCT ON (bd.id, s.siren)
  bd.id, s.siren, s.denomination, dir->>'qualite', s.is_active, s.departement, s.date_creation, s.forme_juridique
FROM public.brh_sci_companies s,
     jsonb_array_elements(s.dirigeants) AS dir
JOIN public.brh_dirigeants bd
  ON bd.nom_norm = lower(regexp_replace(COALESCE(dir->>'nom',''), '[^a-zA-ZÀ-ÿ]', '', 'g'))
 AND bd.prenom_norm = lower(regexp_replace(COALESCE(dir->>'prenom',''), '[^a-zA-ZÀ-ÿ]', '', 'g'))
WHERE jsonb_array_length(s.dirigeants) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.brh_dirigeant_sci ds
    WHERE ds.dirigeant_id = bd.id AND ds.siren = s.siren
  )
ON CONFLICT DO NOTHING;
