-- 2026-05-19 — Améliore la qualité de brh_dvf_archive sans rien écraser.
--
-- Contexte : 58 % des mutations DVF n'ont pas de surface_reelle_bati :
--   - VEFA (Vente en l'État Futur d'Achèvement) : surfaces non encore définies
--   - Ventes groupées d'immeubles entiers : prix global non ventilé par lot
--   - Quelques ventes terrain nu (terrain uniquement)
-- Si on calcule naïvement prix/surface, on obtient NULL ou nombres absurdes.
--
-- Solution : 3 colonnes calculées qui REFLÈTENT l'état de la donnée, n'écrasent rien.
--   - prix_m2_calc : SEULEMENT si surface_reelle_bati > 0
--   - is_groupee : TRUE si Vente/VEFA SANS surface (groupée par essence)
--   - usable_for_brh : TRUE si Vente + Maison/Appartement + surface > 0 (utilisable
--     pour signal commercial BRH : vente d'habitat unitaire)

ALTER TABLE public.brh_dvf_archive
  ADD COLUMN IF NOT EXISTS prix_m2_calc integer,
  ADD COLUMN IF NOT EXISTS is_groupee boolean,
  ADD COLUMN IF NOT EXISTS usable_for_brh boolean;

-- Backfill : ne touche que les NULL (idempotent, ne casse rien)
UPDATE public.brh_dvf_archive
SET
  prix_m2_calc = CASE
    WHEN surface_reelle_bati IS NOT NULL AND surface_reelle_bati > 0
      AND valeur_fonciere_cents IS NOT NULL AND valeur_fonciere_cents > 0
    THEN (valeur_fonciere_cents / 100 / surface_reelle_bati)::integer
    ELSE NULL
  END,
  is_groupee = (
    valeur_fonciere_cents IS NOT NULL
    AND (surface_reelle_bati IS NULL OR surface_reelle_bati = 0)
    AND nature_mutation IN ('Vente', 'Vente en l''état futur d''achèvement', 'Adjudication')
  ),
  usable_for_brh = (
    nature_mutation = 'Vente'
    AND type_local IN ('Maison', 'Appartement')
    AND surface_reelle_bati IS NOT NULL
    AND surface_reelle_bati > 0
    AND valeur_fonciere_cents IS NOT NULL
    AND valeur_fonciere_cents > 0
  )
WHERE prix_m2_calc IS NULL AND is_groupee IS NULL AND usable_for_brh IS NULL;

-- Index pour filtres rapides côté front BRH
CREATE INDEX IF NOT EXISTS brh_dvf_archive_usable_idx
  ON public.brh_dvf_archive (usable_for_brh)
  WHERE usable_for_brh = TRUE;

CREATE INDEX IF NOT EXISTS brh_dvf_archive_addr_idx
  ON public.brh_dvf_archive (code_postal, lower(adresse_voie))
  WHERE adresse_voie IS NOT NULL;

COMMENT ON COLUMN public.brh_dvf_archive.prix_m2_calc IS
  '2026-05-19 — Prix au m² (€), uniquement si surface_reelle_bati > 0. NULL sinon (mutations groupées/VEFA).';
COMMENT ON COLUMN public.brh_dvf_archive.is_groupee IS
  '2026-05-19 — TRUE si mutation avec prix mais sans surface (VEFA, immeuble entier). Ne pas afficher prix/m² dans l''UI.';
COMMENT ON COLUMN public.brh_dvf_archive.usable_for_brh IS
  '2026-05-19 — TRUE si mutation exploitable comme signal commercial BRH (Vente + Maison/Appartement + surface valide).';
