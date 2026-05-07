-- Phase 19 Sprint G — Ingestion seed DVF Bretagne 2024 + PLU Brest pre-cache (07/05/2026)
--
-- Cette migration trace une operation d'ingestion data faite directement via psql
-- (pas reproductible automatiquement — c'est un seed one-shot a partir du CSV
-- officiel data.gouv.fr/geo-dvf 2024).
--
-- Source DVF : https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/{22,29,35,44,56}.csv.gz
-- Total : 104 225 mutations 2024 sur les 5 departements bretons.
--
-- Source PLU Brest : PDF 63MB de Brest Metropole (208 pages), telecharge depuis
-- echanges.brest-metropole.fr, texte extrait via pypdf (419k chars), analyse via
-- Claude Sonnet 4.6 (claude-sonnet-4-5-20250929) avec 164k input tokens / 3k output.
-- 7 zones principales extraites + zones ABF + synthese + mentions obligatoires.
--
-- L'EF plu-summarize-ai retourne erreur 'pdf_too_large' pour Brest (PDF > 32MB
-- limite Claude PDF input). Le pre-cache permet d'avoir le resume affiche
-- malgre la limite. Pour les autres grosses villes (Rennes/Nantes), prevoir le
-- meme pipeline standalone si necessaire.
--
-- Cette migration ne fait rien fonctionnellement — elle existe pour la
-- tracabilite. Les inserts ont deja ete faits via psql direct.

-- Marqueur de version pour eviter les re-runs accidentels
DO $$
BEGIN
  RAISE NOTICE 'Phase 19 Sprint G : DVF Bretagne 104k + PLU Brest seed (07/05/2026) — fait via psql direct.';
END $$;
