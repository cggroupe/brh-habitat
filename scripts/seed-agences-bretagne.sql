-- ============================================================================
-- Phase R18 — Seed démo : 12 agences immobilières fictives Bretagne.
--
-- Permet d'avoir tout de suite quelque chose à afficher sur /pro/terrain
-- et /admin/agences-immo. Coordonnées approximatives (centre-ville).
--
-- Lancement :
--   PGPASSWORD='${BRH_SUPABASE_DB_PASSWORD:?Set this env var first}' psql "postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" -f scripts/seed-agences-bretagne.sql
-- ============================================================================

-- Anti-doublon : INSERT ON CONFLICT (siret) DO NOTHING permet d'exécuter
-- plusieurs fois sans erreur. Les agences fictives ont des SIRET inventés
-- 7000000XXXXXXX (format valide 14 chiffres mais hors annuaire SIRENE).
INSERT INTO brh_agences_immo
  (siret, raison_sociale, representant, email, telephone, site_web,
   adresse, code_postal, commune, departement, latitude, longitude,
   status, notes)
VALUES
  -- Finistère (29)
  ('70000001000010', 'Bretagne Habitat Brest',  'Marie Le Floch',
   'contact@bh-brest.fr.example', '02 98 11 22 33', 'https://bh-brest.fr.example',
   '12 rue de Siam', '29200', 'Brest', '29', 48.39, -4.49,
   'prospect', 'Premier contact à initier — secteur ancien, beaucoup F/G'),

  ('70000001000028', 'Quimper Immo Conseil',   'Yann Pennec',
   'contact@qic.fr.example',     '02 98 22 33 44', NULL,
   '5 quai Steir', '29000', 'Quimper', '29', 48.0, -4.10,
   'contacted', 'Rendez-vous prévu, intéressé par leads F/G'),

  ('70000001000036', 'Concarneau Litoral',      'Soizic Tanguy',
   'contact@concarneau-litoral.fr.example', '02 98 97 12 12', NULL,
   '8 avenue de la Gare', '29900', 'Concarneau', '29', 47.87, -3.92,
   'prospect', 'Spécialiste maisons secondaires côtières'),

  -- Côtes-d''Armor (22)
  ('70000001000044', 'Saint-Brieuc Patrimoine', 'Thierry Le Goff',
   'tlegoff@sb-patrimoine.fr.example', '02 96 33 44 55', NULL,
   '20 rue Saint-Guillaume', '22000', 'Saint-Brieuc', '22', 48.51, -2.77,
   'partenaire', 'Convention signée 04/2026 — leads F/G prioritaires'),

  ('70000001000051', 'Lannion Habitat',         'Cécile Riou',
   'contact@lannion-habitat.fr.example', '02 96 37 88 99', NULL,
   '3 place du Centre', '22300', 'Lannion', '22', 48.73, -3.46,
   'contacted', 'Très volume IDF/résidences secondaires'),

  ('70000001000069', 'Dinan Immobilier',        'Pierre Le Bras',
   'pierre@dinan-immo.fr.example', '02 96 39 00 11', NULL,
   '15 rue Saint-Malo', '22100', 'Dinan', '22', 48.45, -2.05,
   'prospect', NULL),

  -- Ille-et-Vilaine (35)
  ('70000001000077', 'Rennes Habitat Premium',  'Anne-Sophie Pichon',
   'contact@rhp-rennes.fr.example', '02 99 11 33 55', 'https://rhp-rennes.fr.example',
   '12 rue Le Bastard', '35000', 'Rennes', '35', 48.117, -1.677,
   'partenaire', 'Convention signée 02/2026 — partenaire phare Rennes Métropole'),

  ('70000001000085', 'Saint-Malo Côte Émeraude', 'Marc Morvan',
   'contact@saintmalo-emeraude.fr.example', '02 99 56 12 12', NULL,
   '8 chaussée du Sillon', '35400', 'Saint-Malo', '35', 48.65, -2.02,
   'contacted', 'Marché hyper-tendu — résidences secondaires majoritaires'),

  ('70000001000093', 'Vitré Patrimoine',        'Hélène Quenec''hdu',
   'contact@vitre-patrimoine.fr.example', '02 99 75 90 90', NULL,
   '6 place du Château', '35500', 'Vitré', '35', 48.12, -1.21,
   'prospect', 'Centre historique — beaucoup de bâtisses anciennes'),

  -- Morbihan (56)
  ('70000001000101', 'Vannes Atlantique Immo',  'Erwan Le Saout',
   'contact@vai-vannes.fr.example', '02 97 47 60 60', NULL,
   '2 rue Thiers', '56000', 'Vannes', '56', 47.66, -2.76,
   'contacted', 'Discussion en cours partenariat'),

  ('70000001000119', 'Lorient Habitat',         'Gwenaëlle Riou',
   'contact@lorient-habitat.fr.example', '02 97 64 13 13', NULL,
   '12 rue du Port', '56100', 'Lorient', '56', 47.75, -3.36,
   'prospect', 'Reconstruction post-guerre — nombreux F/G dans logements années 50'),

  ('70000001000127', 'Quiberon Presqu''île',    'Jean-François Le Bihan',
   'contact@quiberon-presquile.fr.example', '02 97 50 13 13', NULL,
   '15 rue de Verdun', '56170', 'Quiberon', '56', 47.48, -3.12,
   'refused', 'Refus 03/2026 : trop niche, peu de F/G dans le secteur')

ON CONFLICT (siret) DO NOTHING;

-- Récap
SELECT
  COUNT(*) AS total_agences,
  COUNT(*) FILTER (WHERE status = 'partenaire')  AS partenaires,
  COUNT(*) FILTER (WHERE status = 'contacted')   AS contactees,
  COUNT(*) FILTER (WHERE status = 'prospect')    AS prospects,
  COUNT(*) FILTER (WHERE status = 'refused')     AS refusees
FROM brh_agences_immo;
