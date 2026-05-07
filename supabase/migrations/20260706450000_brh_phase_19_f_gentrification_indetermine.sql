-- Phase 19 Sprint F.1 — fix label gentrification 'indetermine' (07/05/2026)
-- Quand DVF mutations=0 (cache pas encore charge), label='declin' etait un faux
-- positif. On ajoute 'indetermine' au check constraint et on migre les rows
-- existantes.

ALTER TABLE brh_communes_sociodemo
  DROP CONSTRAINT IF EXISTS brh_communes_sociodemo_gentrification_label_check;

ALTER TABLE brh_communes_sociodemo
  ADD CONSTRAINT brh_communes_sociodemo_gentrification_label_check
  CHECK (gentrification_label IN (
    'indetermine','declin','stable','dynamique',
    'en_gentrification','gentrifiee','tres_gentrifiee'
  ));

UPDATE brh_communes_sociodemo
   SET gentrification_label = 'indetermine'
 WHERE gentrification_score = 0
   AND gentrification_label = 'declin';
