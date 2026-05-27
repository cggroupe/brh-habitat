-- =============================================================================
-- 2026-05-27 PM — Cleanup dirigeants JSONB malformés issus d'ingests SIRENE
-- =============================================================================
--
-- La migration 20260527170000 (resync brh_dirigeants depuis JSONB) avait
-- identifié "8 SCI résiduelles edge case sans nom valide". Audit 27/05 PM :
-- en réalité ~30+ entrées polluent encore le JSONB de brh_sci_companies.dirigeants,
-- avec des nom invalides du type :
--   - "B6" / "C" / "K" / "H" / "A" (initiales seules, vrai nom dans prenom)
--   - "20" / "1972" / "85" (chiffres = code postal ou millésime parsé en nom)
--   - "*" / "-" (caractères de séparation)
--
-- Conséquence : ces entrées polluent l'UI dans 3 composants (SciCard,
-- FicheEntrepriseView tab Décideurs, FicheAdresseView panneau SCI).
--
-- La table normalisée brh_dirigeants est déjà PROPRE (la migration de resync
-- filtrait `WHERE length(nom_norm) > 1`). Cette migration nettoie le JSONB.
--
-- Stratégie : reconstruit dirigeants[] en gardant uniquement les entrées dont
-- le nom contient au moins 2 lettres alphabétiques après normalisation.
--
-- Idempotente : ne touche que les SCI qui ont au moins une entrée invalide.
-- Réversible : original récupérable depuis la table brh_sci_companies_audit
-- (créée juste avant la cleanup).
-- =============================================================================

-- Backup audit (snapshot avant cleanup, conservé 30j).
CREATE TABLE IF NOT EXISTS public.brh_sci_companies_dirigeants_audit_20260527 (
  siren text PRIMARY KEY,
  dirigeants_before jsonb NOT NULL,
  dirigeants_after jsonb NOT NULL,
  cleaned_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.brh_sci_companies_dirigeants_audit_20260527 IS
  '2026-05-27 — Backup pre-cleanup des dirigeants JSONB malformés. Rollback : UPDATE brh_sci_companies SET dirigeants = a.dirigeants_before FROM ce_table a WHERE brh_sci_companies.siren = a.siren. À supprimer après 30j (26/06/2026).';

-- Cleanup en une seule passe : reconstruit dirigeants[] en ne gardant que
-- les entrées dont nom_norm fait ≥ 2 caractères alphabétiques.
WITH affected AS (
  SELECT
    s.siren,
    s.dirigeants AS dirigeants_before,
    COALESCE(
      jsonb_agg(dir ORDER BY ord) FILTER (
        WHERE length(lower(regexp_replace(COALESCE(dir->>'nom',''), '[^a-zA-ZÀ-ÿ]', '', 'g'))) >= 2
      ),
      '[]'::jsonb
    ) AS dirigeants_after
  FROM public.brh_sci_companies s,
       jsonb_array_elements(s.dirigeants) WITH ORDINALITY AS arr(dir, ord)
  WHERE jsonb_array_length(s.dirigeants) > 0
  GROUP BY s.siren, s.dirigeants
),
needs_cleanup AS (
  SELECT * FROM affected
  WHERE dirigeants_before <> dirigeants_after
)
INSERT INTO public.brh_sci_companies_dirigeants_audit_20260527 (siren, dirigeants_before, dirigeants_after)
SELECT siren, dirigeants_before, dirigeants_after
FROM needs_cleanup
ON CONFLICT (siren) DO NOTHING;

UPDATE public.brh_sci_companies sci
SET dirigeants = a.dirigeants_after
FROM public.brh_sci_companies_dirigeants_audit_20260527 a
WHERE sci.siren = a.siren
  AND sci.dirigeants <> a.dirigeants_after;

-- Statistiques pour traçabilité (visible dans les logs Supabase).
DO $$
DECLARE
  v_affected int;
  v_removed int;
BEGIN
  SELECT count(*) INTO v_affected FROM public.brh_sci_companies_dirigeants_audit_20260527;
  SELECT count(*) INTO v_removed
  FROM public.brh_sci_companies_dirigeants_audit_20260527 a,
       jsonb_array_elements(a.dirigeants_before) AS b(dir)
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(a.dirigeants_after) AS x(dir2)
    WHERE x.dir2 = b.dir
  );
  RAISE NOTICE 'Cleanup dirigeants JSONB : % SCI affectées, % entrées invalides supprimées', v_affected, v_removed;
END $$;
