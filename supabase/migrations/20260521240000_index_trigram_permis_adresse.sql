-- 2026-05-21 — Audit final — Index GIN trigram sur permis adresse
--
-- BOTTLENECK DÉTECTÉ audit Philippe :
--   La regex `lower(f_unaccent(pc.adresse_complete)) ~ '\m<voie>\M'` sur
--   195 828 permis × ~10k clients dept 29 = full scan systématique →
--   timeout sur Supabase Management API (et probablement aussi sur Edge
--   Functions si appel batch).
--
-- SOLUTION : index GIN trigram (pg_trgm extension).
--   Le opérateur regex `~` peut utiliser un index trigram avec l'opclass
--   `gin_trgm_ops`. Postgres extrait les trigrammes de la regex et
--   filtre via index avant d'évaluer la regex.
--
-- COÛT : ~50 MB disque (acceptable). Build initial ~30s sur 195k rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index sur l'expression utilisée par le RPC (matching la signature exacte)
CREATE INDEX IF NOT EXISTS idx_brh_permis_adresse_trgm
  ON public.brh_permis_construire
  USING gin (lower(public.f_unaccent(coalesce(adresse_complete, ''))) gin_trgm_ops);

-- Vérif : taille de l'index
DO $$
DECLARE
  v_size text;
BEGIN
  SELECT pg_size_pretty(pg_relation_size('public.idx_brh_permis_adresse_trgm'))
    INTO v_size;
  RAISE NOTICE 'Index trigram permis créé, taille : %', v_size;
END $$;
